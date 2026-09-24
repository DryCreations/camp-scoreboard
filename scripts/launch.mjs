#!/usr/bin/env node
// One-click launcher for Camp Scoreboard: the shared logic behind
// launchers/CampScoreboard.command (macOS) and launchers/CampScoreboard.bat
// (Windows). The double-click wrappers only make sure Node.js and a copy of
// the repo exist, then hand off here. Uses Node built-ins only, because it runs
// before `npm install`.
//
// Steps, each of which keeps going when the network is down (camp Wi-Fi):
//   1. Update the code (git pull, or re-download the tarball if there's no git)
//   2. npm install, only when package-lock.json changed
//   3. Build, only when the source changed
//   4. Set up the OBS WebSocket server (enabled, port, password) and write the
//      same values to .env so the app connects without anyone typing anything
//   5. Start OBS if it isn't running already
//   6. Start the server, open /control in the browser, restart the server if it
//      crashes
//
// Flags: --no-update  --no-obs  --no-browser
// Env:   CAMP_BRANCH (default main), CAMP_OBS_PATH (custom OBS location)

import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url);
const REPO_SLUG = 'DryCreations/camp-scoreboard';
const BRANCH = process.env.CAMP_BRANCH || 'main';
const STATE_FILE = path.join(ROOT, '.launcher-state.json');
const ENV_FILE = path.join(ROOT, '.env');
const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

const argv = process.argv.slice(2);
const flags = new Set(argv);

// Put this Node's folder first on PATH so npm and its scripts use the same Node.
const nodeDir = path.dirname(fs.realpathSync(process.execPath));
process.env.PATH = nodeDir + path.delimiter + (process.env.PATH || '');

// ---------------------------------------------------------------- output ---

const log = (msg = '') => console.log(msg);
const step = (msg) => console.log(`\n==> ${msg}`);
const warn = (msg) => console.log(`  ! ${msg}`);
function die(msg) {
	console.log(`\nERROR: ${msg}\n`);
	process.exit(1);
}

// --------------------------------------------------------------- helpers ---

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
	return { ok: r.status === 0, code: r.status, out: (r.stdout || '').trim(), err: r.stderr || '' };
}

function hashFiles(paths) {
	const h = crypto.createHash('sha256');
	const walk = (p) => {
		if (!fs.existsSync(p)) return;
		const st = fs.statSync(p);
		if (st.isDirectory()) {
			for (const name of fs.readdirSync(p).sort()) walk(path.join(p, name));
		} else {
			h.update(path.relative(ROOT, p));
			h.update(fs.readFileSync(p));
		}
	};
	for (const p of paths) walk(path.join(ROOT, p));
	return h.digest('hex');
}

function readState() {
	try {
		return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
	} catch {
		return {};
	}
}

function writeState(patch) {
	fs.writeFileSync(STATE_FILE, JSON.stringify({ ...readState(), ...patch }, null, '\t'));
}

function readEnvFile() {
	const out = {};
	if (!fs.existsSync(ENV_FILE)) return out;
	for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
		if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
	}
	return out;
}

// Set keys in .env in place, keeping comments and any other values.
function setEnvValues(values) {
	let text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
	for (const [key, value] of Object.entries(values)) {
		const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
		const line = `${key}=${value}`;
		if (re.test(text)) text = text.replace(re, line);
		else text += (text && !text.endsWith('\n') ? '\n' : '') + line + '\n';
	}
	fs.writeFileSync(ENV_FILE, text);
}

async function isServing(port) {
	try {
		await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
		return true;
	} catch {
		return false;
	}
}

function openUrl(url) {
	const [cmd, args] = IS_WIN
		? ['rundll32', ['url.dll,FileProtocolHandler', url]]
		: [IS_MAC ? 'open' : 'xdg-open', [url]];
	try {
		spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
	} catch {
		/* no browser available — the URL is printed anyway */
	}
}

function lanAddresses() {
	const ips = [];
	for (const list of Object.values(os.networkInterfaces())) {
		for (const a of list || []) {
			if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) ips.push(a.address);
		}
	}
	return ips;
}

// ------------------------------------------------------------ 1. update ---

function gitAvailable() {
	return fs.existsSync(path.join(ROOT, '.git')) && run('git', ['--version']).ok;
}

function updateWithGit() {
	const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out;
	if (!branch || branch === 'HEAD') {
		warn('Not on a branch (detached HEAD); skipping update.');
		return;
	}
	const fetched = run('git', ['fetch', '--quiet', 'origin', branch], { timeout: 60_000 });
	if (!fetched.ok) {
		warn('Could not reach GitHub (offline?). Using the code already on this computer.');
		return;
	}
	const remote = `origin/${branch}`;
	if (run('git', ['rev-parse', 'HEAD']).out === run('git', ['rev-parse', remote]).out) {
		log('  Already up to date.');
		return;
	}

	// Some tracked files are rewritten while the app runs (e.g. data/assets.json).
	// Put local edits aside, fast-forward, then put them back. If a file changed
	// on both sides, the local copy wins: it's this computer's live data.
	const changed = run('git', ['diff', '--name-only', 'HEAD']).out.split('\n').filter(Boolean);
	const dirty = changed.length > 0;
	if (dirty && !run('git', ['stash', 'push', '--quiet', '-m', 'camp-launcher autosave']).ok) {
		warn('Could not set aside local changes; skipping update.');
		return;
	}
	const merged = run('git', ['merge', '--ff-only', '--quiet', remote]);
	if (dirty && !run('git', ['stash', 'pop', '--quiet']).ok) {
		run('git', ['checkout', 'stash@{0}', '--', ...changed]);
		run('git', ['reset', '--quiet']);
		run('git', ['stash', 'drop', '--quiet']);
		warn('Kept this computer\'s copy of files that were also changed on GitHub.');
	}
	if (merged.ok) log(`  Updated to the latest ${branch}.`);
	else warn(`This copy has its own commits, so it can't fast-forward to ${remote}; skipping update.`);
}

async function updateWithTarball() {
	const url = `https://codeload.github.com/${REPO_SLUG}/tar.gz/refs/heads/${BRANCH}`;
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-scoreboard-'));
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const archive = path.join(tmp, 'src.tar.gz');
		fs.writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
		const out = path.join(tmp, 'src');
		fs.mkdirSync(out);
		const tar = IS_WIN ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
		if (!run(tar, ['-xzf', archive, '-C', out, '--strip-components=1']).ok) throw new Error('could not unpack');
		// Copy over the install, except for files that already exist under data/:
		// those hold this computer's config, uploads and asset list.
		fs.cpSync(out, ROOT, {
			recursive: true,
			force: true,
			filter: (src) => {
				const rel = path.relative(out, src);
				const isData = rel === 'data' || rel.startsWith('data' + path.sep);
				return !(isData && rel !== 'data' && fs.existsSync(path.join(ROOT, rel)) && fs.statSync(src).isFile());
			}
		});
		log(`  Downloaded the latest ${BRANCH}.`);
	} catch (err) {
		warn(`Could not download an update (${err.message}). Using the code already on this computer.`);
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
}

async function update() {
	step('Checking for updates');
	const before = hashFiles([path.relative(ROOT, SELF)]);
	if (gitAvailable()) updateWithGit();
	else await updateWithTarball();

	// If this launcher itself changed, hand off to the new version.
	if (hashFiles([path.relative(ROOT, SELF)]) !== before) {
		log('  The launcher was updated; restarting it.');
		const r = spawnSync(process.execPath, [SELF, ...argv, '--no-update'], { stdio: 'inherit' });
		process.exit(r.status ?? 1);
	}
}

// ------------------------------------------------ 2 + 3. install & build ---

function npm(args) {
	const cli = [
		path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'), // Windows layout
		path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js') // macOS/Linux
	].find((p) => fs.existsSync(p));
	const r = cli
		? spawnSync(process.execPath, [cli, ...args], { cwd: ROOT, stdio: 'inherit' })
		: spawnSync('npm', args, { cwd: ROOT, stdio: 'inherit', shell: true });
	return r.status === 0;
}

function installDependencies() {
	const hash = hashFiles(['package.json', 'package-lock.json']);
	const hasModules = fs.existsSync(path.join(ROOT, 'node_modules', 'vite'));
	if (hasModules && readState().depsHash === hash) return;

	step('Installing dependencies (first run or after an update; this can take a few minutes)');
	const ok = npm(['ci', '--no-audit', '--no-fund']) || npm(['install', '--no-audit', '--no-fund']);
	if (ok) writeState({ depsHash: hash });
	else if (hasModules) warn('npm install failed (offline?). Using the dependencies already installed.');
	else die('Could not install dependencies. Connect to the internet for the first run and try again.');
}

function build() {
	const hash = hashFiles(['src', 'static', 'package-lock.json', 'svelte.config.js', 'vite.config.js']);
	const hasBuild = fs.existsSync(path.join(ROOT, 'build', 'handler.js'));
	if (hasBuild && readState().buildHash === hash) return;

	step('Building the app');
	const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
	const r = spawnSync(process.execPath, [vite, 'build'], { cwd: ROOT, stdio: 'inherit' });
	if (r.status === 0) writeState({ buildHash: hash });
	else if (hasBuild) warn('Build failed. Starting the previous build instead.');
	else die('Build failed; see the messages above.');
}

// -------------------------------------------------------------- 4 + 5. OBS ---

function obsConfigDir() {
	if (IS_WIN) return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'obs-studio');
	if (IS_MAC) return path.join(os.homedir(), 'Library', 'Application Support', 'obs-studio');
	return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'obs-studio');
}

function findObs() {
	const custom = process.env.CAMP_OBS_PATH;
	if (custom && fs.existsSync(custom)) return custom;
	const candidates = [];
	if (IS_WIN) {
		const reg = run('reg', ['query', 'HKLM\\SOFTWARE\\OBS Studio', '/ve']).out.match(/REG_SZ\s+(.+)$/m);
		if (reg) candidates.push(path.join(reg[1].trim(), 'bin', '64bit', 'obs64.exe'));
		for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files']) {
			if (base) candidates.push(path.join(base, 'obs-studio', 'bin', '64bit', 'obs64.exe'));
		}
		candidates.push('C:\\Program Files (x86)\\Steam\\steamapps\\common\\OBS Studio\\bin\\64bit\\obs64.exe');
	} else if (IS_MAC) {
		candidates.push('/Applications/OBS.app', path.join(os.homedir(), 'Applications', 'OBS.app'));
	} else {
		const which = run('which', ['obs']).out;
		if (which) candidates.push(which);
	}
	return candidates.find((p) => fs.existsSync(p)) || null;
}

function isObsRunning() {
	if (IS_WIN) {
		return /obs64\.exe/i.test(run('tasklist', ['/FI', 'IMAGENAME eq obs64.exe', '/NH']).out);
	}
	return run('pgrep', ['-x', IS_MAC ? 'OBS' : 'obs']).ok;
}

function launchObs(obsPath) {
	// --disable-shutdown-check skips OBS's "safe mode?" prompt after an unclean exit.
	const args = ['--disable-shutdown-check'];
	if (IS_MAC) {
		spawn('open', ['-a', obsPath, '--args', ...args], { detached: true, stdio: 'ignore' }).unref();
	} else {
		// OBS on Windows must start from its own folder or it can't find its files.
		spawn(obsPath, args, { cwd: path.dirname(obsPath), detached: true, stdio: 'ignore' }).unref();
	}
}

// Turn on OBS's built-in WebSocket server (OBS 28+) and copy the port and
// password into .env, which src/lib/server/obs.js reads. OBS only reads its
// config file at startup, so we only write it while OBS is closed.
function setupObs() {
	step('Setting up OBS');
	const env = readEnvFile();
	const host = env.OBS_HOST || '127.0.0.1';
	if (!['127.0.0.1', 'localhost'].includes(host)) {
		log(`  .env points OBS_HOST at ${host}; leaving OBS alone.`);
		return;
	}

	const obsPath = findObs();
	if (!obsPath) {
		warn('OBS Studio is not installed; the scoreboard will run without OBS control.');
		warn(
			IS_WIN
				? 'Install it from https://obsproject.com or run:  winget install -e --id OBSProject.OBSStudio'
				: 'Install it from https://obsproject.com, then run this again.'
		);
		return;
	}

	const cfgPath = path.join(obsConfigDir(), 'plugin_config', 'obs-websocket', 'config.json');
	let cfg = null;
	try {
		cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
	} catch {
		cfg = null;
	}

	if (isObsRunning()) {
		if (cfg?.server_enabled) {
			setEnvValues({
				OBS_HOST: '127.0.0.1',
				OBS_PORT: cfg.server_port || 4455,
				OBS_PASSWORD: cfg.auth_required ? cfg.server_password || '' : ''
			});
			log('  OBS is already open; using its WebSocket settings.');
		} else {
			warn('OBS is open, but its WebSocket server is turned off.');
			warn('Close OBS and run this launcher again to set it up automatically, or turn it on in');
			warn('OBS under Tools > WebSocket Server Settings and copy the password into .env.');
		}
		return;
	}

	const password = cfg?.server_password || env.OBS_PASSWORD || crypto.randomBytes(12).toString('base64url');
	const port = Number(cfg?.server_port) || Number(env.OBS_PORT) || 4455;
	const next = {
		...cfg,
		alerts_enabled: cfg?.alerts_enabled ?? false,
		auth_required: true,
		first_load: false,
		server_enabled: true,
		server_password: password,
		server_port: port
	};
	if (JSON.stringify(next) !== JSON.stringify(cfg)) {
		fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
		fs.writeFileSync(cfgPath, JSON.stringify(next, null, 4));
		log('  Turned on the OBS WebSocket server.');
	}
	setEnvValues({ OBS_HOST: '127.0.0.1', OBS_PORT: port, OBS_PASSWORD: password });

	log('  Starting OBS.');
	launchObs(obsPath);
}

// ------------------------------------------------------------- 6. server ---

async function startServer(port) {
	step('Starting the scoreboard');
	let child = null;
	let stopping = false;
	let crashes = [];

	const start = () => {
		child = spawn(process.execPath, ['server.js'], { cwd: ROOT, stdio: 'inherit' });
		child.on('exit', (code) => {
			if (stopping) return process.exit(0);
			const now = Date.now();
			crashes = crashes.filter((t) => now - t < 60_000).concat(now);
			if (crashes.length > 5) die('The server keeps crashing; see the messages above.');
			warn(`Server stopped (code ${code}); restarting in 3 seconds.`);
			setTimeout(start, 3000);
		});
	};
	for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
		process.on(sig, () => {
			stopping = true;
			child?.kill();
			setTimeout(() => process.exit(0), 3000).unref();
		});
	}
	start();

	for (let i = 0; i < 60 && !(await isServing(port)); i++) await new Promise((r) => setTimeout(r, 500));

	log('\n============================================================');
	log(' Camp Scoreboard is running.');
	log(`   On this computer:  http://localhost:${port}/control`);
	for (const ip of lanAddresses()) log(`   Phone / iPad:      http://${ip}:${port}/control`);
	log('   (Phones and iPads must be on the same Wi-Fi as this computer.)');
	log(' Keep this window open. Close it or press Ctrl+C to stop.');
	log('============================================================\n');
	if (!flags.has('--no-browser')) openUrl(`http://localhost:${port}/control`);
}

// ------------------------------------------------------------------ main ---

async function main() {
	log('Camp Scoreboard launcher');
	log(`  App folder: ${ROOT}`);
	log(`  Node.js:    ${process.version}`);

	if (!fs.existsSync(ENV_FILE) && fs.existsSync(path.join(ROOT, '.env.example'))) {
		fs.copyFileSync(path.join(ROOT, '.env.example'), ENV_FILE);
	}
	const port = Number(readEnvFile().PORT) || 3000;

	if (await isServing(port)) {
		log(`\nCamp Scoreboard is already running on port ${port}; opening it.`);
		if (!flags.has('--no-browser')) openUrl(`http://localhost:${port}/control`);
		return;
	}

	if (!flags.has('--no-update') && process.env.CAMP_NO_UPDATE !== '1') await update();
	installDependencies();
	build();
	if (!flags.has('--no-obs')) setupObs();
	await startServer(port);
}

main().catch((err) => die(err?.stack || String(err)));
