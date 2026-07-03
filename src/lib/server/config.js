import fs from 'node:fs';
import path from 'node:path';

// Persisted config lives in data/config.json at the project root. Using
// path.join (never string concat) keeps this correct on Windows and macOS.
const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

export function loadConfig() {
	const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
	return JSON.parse(raw);
}

// Write to a temp file then rename, so a crash mid-write can't leave a
// half-written (corrupt) config.json. rename is atomic on both platforms.
export function saveConfig(config) {
	const tmp = CONFIG_PATH + '.tmp';
	fs.writeFileSync(tmp, JSON.stringify(config, null, '\t'));
	fs.renameSync(tmp, CONFIG_PATH);
}
