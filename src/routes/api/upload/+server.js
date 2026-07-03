import { json, error } from '@sveltejs/kit';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Receives a logo image from the control panel (phone camera roll / file
// picker), saves it under data/uploads/, and returns the relative path to store
// in the theme config. Served back via /uploads/[name].
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

export async function POST({ request }) {
	const form = await request.formData();
	const file = form.get('file');
	if (!file || typeof file === 'string') throw error(400, 'no file provided');

	await mkdir(UPLOAD_DIR, { recursive: true });
	const ext = (path.extname(file.name) || '.png').toLowerCase();
	const name = randomUUID().slice(0, 8) + ext;
	const buf = Buffer.from(await file.arrayBuffer());
	await writeFile(path.join(UPLOAD_DIR, name), buf);

	return json({ path: '/uploads/' + name });
}
