import fs from 'node:fs';
import path from 'node:path';

// Soundboard sounds live as plain audio files in data/sounds/. Drop a .wav/.mp3/
// .ogg in there and it shows up automatically. data/sounds/sounds.json is an
// optional map of filename -> friendly display name; files not listed there just
// use their filename (minus extension) as the label.
const SOUNDS_DIR = path.join(process.cwd(), 'data', 'sounds');
const NAMES_FILE = path.join(SOUNDS_DIR, 'sounds.json');
const AUDIO_EXT = new Set(['.wav', '.mp3', '.ogg', '.m4a', '.aac']);

/** @returns {{ file: string, name: string }[]} */
export function listSounds() {
	let names = {};
	try {
		names = JSON.parse(fs.readFileSync(NAMES_FILE, 'utf-8'));
	} catch {
		/* no names file — fall back to filenames */
	}

	let files = [];
	try {
		files = fs.readdirSync(SOUNDS_DIR);
	} catch {
		return [];
	}

	return files
		.filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase()))
		.sort()
		.map((file) => ({
			file,
			name: names[file] || path.basename(file, path.extname(file))
		}));
}
