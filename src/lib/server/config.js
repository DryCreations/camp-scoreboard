import fs from 'node:fs';
import path from 'node:path';

// Persisted config lives in data/config.json at the project root. Using
// path.join (never string concat) keeps this correct on Windows and macOS.
const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');
const CONFIG_EXAMPLE_PATH = path.join(process.cwd(), 'data', 'config.example.json');

const CONFIG_VERSION = 2;

function readJson(p) {
	return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// Lightweight validation + migration. Merges the shipped example as defaults so
// older configs automatically gain new fields (glowIntensity, showDividers,
// presets, …) without losing the user's values, and stamps a version. This is
// the safety net that lets later phases add config fields freely.
function migrate(cfg, example) {
	const c = cfg && typeof cfg === 'object' ? cfg : {};
	const e = example && typeof example === 'object' ? example : {};
	return {
		version: CONFIG_VERSION,
		settings: { ...e.settings, ...c.settings },
		theme: { ...e.theme, ...c.theme },
		displays: Array.isArray(c.displays) && c.displays.length ? c.displays : e.displays ?? [],
		triggers: Array.isArray(c.triggers) && c.triggers.length ? c.triggers : e.triggers ?? [],
		presets: Array.isArray(c.presets) && c.presets.length ? c.presets : e.presets ?? [],
		activePreset: c.activePreset ?? e.activePreset ?? 'broadcast'
	};
}

export function loadConfig() {
	let example = {};
	try {
		example = readJson(CONFIG_EXAMPLE_PATH);
	} catch {
		/* example missing/unreadable — migrate() still fills sane empties */
	}

	if (!fs.existsSync(CONFIG_PATH)) {
		// First run: seed machine-local config so runtime edits persist off-git.
		const seeded = migrate(example, example);
		saveConfig(seeded);
		return seeded;
	}

	let user;
	try {
		user = readJson(CONFIG_PATH);
	} catch (err) {
		// Corrupt JSON — preserve it for inspection, then reseed from the example
		// rather than crashing the whole app on boot.
		console.warn('[config] config.json is invalid, reseeding from example:', err?.message ?? err);
		try {
			fs.renameSync(CONFIG_PATH, `${CONFIG_PATH}.corrupt-${Date.now()}`);
		} catch {
			/* ignore */
		}
		const seeded = migrate(example, example);
		saveConfig(seeded);
		return seeded;
	}

	// Migrate on load and persist so the on-disk file gains any new fields.
	const migrated = migrate(user, example);
	saveConfig(migrated);
	return migrated;
}

// Write to a temp file then rename, so a crash mid-write can't leave a
// half-written (corrupt) config.json. rename is atomic on both platforms.
export function saveConfig(config) {
	const tmp = CONFIG_PATH + '.tmp';
	fs.writeFileSync(tmp, JSON.stringify(config, null, '\t'));
	fs.renameSync(tmp, CONFIG_PATH);
}
