import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Serves soundboard audio from data/sounds/. basename() strips any path so this
// can't traverse out of the sounds directory.
const SOUNDS_DIR = path.join(process.cwd(), 'data', 'sounds');

const TYPES = {
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.ogg': 'audio/ogg',
	'.m4a': 'audio/mp4',
	'.aac': 'audio/aac'
};

export async function GET({ params }) {
	const name = path.basename(params.name);
	try {
		const buf = await readFile(path.join(SOUNDS_DIR, name));
		return new Response(buf, {
			headers: {
				'content-type': TYPES[path.extname(name).toLowerCase()] ?? 'application/octet-stream',
				'cache-control': 'public, max-age=3600'
			}
		});
	} catch {
		throw error(404, 'not found');
	}
}
