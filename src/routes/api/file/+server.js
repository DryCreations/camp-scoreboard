import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Serves an image by absolute filesystem path on the SERVER machine — the
// manual fallback for logos that already live on the host running the app.
// This is a trusted local-network tool (no auth), so arbitrary local reads are
// acceptable here; do not expose this server to the public internet.
const TYPES = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml'
};

export async function GET({ url }) {
	const p = url.searchParams.get('path');
	if (!p) throw error(400, 'missing path');
	try {
		const buf = await readFile(p);
		return new Response(buf, {
			headers: {
				'content-type': TYPES[path.extname(p).toLowerCase()] ?? 'application/octet-stream',
				'cache-control': 'no-cache'
			}
		});
	} catch {
		throw error(404, 'not found');
	}
}
