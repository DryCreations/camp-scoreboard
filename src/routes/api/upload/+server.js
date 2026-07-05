import { json, error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { registerAsset } from '$lib/server/assets.js';

// Receives an image from the control panel (phone camera roll / file picker /
// drag-drop), saves it under data/uploads/, records it in the asset library, and
// returns the asset entry. Served back via /uploads/[name].
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

export async function POST({ request, url }) {
	const form = await request.formData();
	const file = form.get('file');
	if (!file || typeof file === 'string') throw error(400, 'no file provided');

	let ext = (path.extname(file.name) || '.png').toLowerCase();
	if (!ALLOWED.has(ext)) throw error(415, 'unsupported image type');

	await mkdir(UPLOAD_DIR, { recursive: true });
	const filename = randomUUID().slice(0, 8) + ext;
	const buf = Buffer.from(await file.arrayBuffer());
	await writeFile(path.join(UPLOAD_DIR, filename), buf);

	// kind: 'logo' (default) or 'background' — lets the library filter/label.
	const kind = url.searchParams.get('kind') === 'background' ? 'background' : 'logo';
	const asset = registerAsset({ filename, originalName: file.name, kind, bytes: buf.length });

	// Backward-compatible: existing callers read `path`; new callers get `asset`.
	return json({ path: asset.path, asset });
}
