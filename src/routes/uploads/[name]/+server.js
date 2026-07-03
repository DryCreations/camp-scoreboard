import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Serves uploaded logos from data/uploads/. basename() strips any path so this
// can't be used to traverse out of the uploads directory.
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

const TYPES = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml'
};

export async function GET({ params }) {
	const name = path.basename(params.name);
	try {
		const buf = await readFile(path.join(UPLOAD_DIR, name));
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
