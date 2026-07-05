import fs from 'node:fs';
import path from 'node:path';

// Persistent asset library. Image files live in data/uploads/ (git-ignored);
// data/assets.json is a git-ignored metadata index so users can browse, name,
// reuse and delete them — "upload once, reuse forever". listAssets() reconciles
// the index against the actual files on disk (mirrors sounds.js's approach), so
// pre-existing uploads and manual file drops still show up.
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const META_PATH = path.join(process.cwd(), 'data', 'assets.json');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

function readMeta() {
	try {
		const list = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
		return Array.isArray(list) ? list : [];
	} catch {
		return [];
	}
}

function writeMeta(list) {
	const tmp = META_PATH + '.tmp';
	fs.writeFileSync(tmp, JSON.stringify(list, null, '\t'));
	fs.renameSync(tmp, META_PATH);
}

function withPath(m) {
	return { ...m, path: '/uploads/' + m.filename };
}

/** @returns {{id,filename,originalName,kind,bytes,createdAt,path}[]} newest first */
export function listAssets() {
	const meta = readMeta();
	let files = [];
	try {
		files = fs.readdirSync(UPLOAD_DIR).filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
	} catch {
		files = [];
	}

	const byFile = new Map(meta.map((m) => [m.filename, m]));
	let changed = false;

	// Index any files that aren't in the metadata yet (pre-existing uploads).
	for (const f of files) {
		if (!byFile.has(f)) {
			let stat;
			try {
				stat = fs.statSync(path.join(UPLOAD_DIR, f));
			} catch {
				/* ignore */
			}
			byFile.set(f, {
				id: f.replace(/\.[^.]+$/, ''),
				filename: f,
				originalName: f,
				kind: 'logo',
				bytes: stat?.size ?? 0,
				createdAt: stat?.mtimeMs ?? Date.now()
			});
			changed = true;
		}
	}

	// Drop metadata whose underlying file is gone.
	const fileSet = new Set(files);
	const list = [...byFile.values()].filter((m) => fileSet.has(m.filename));
	if (changed || list.length !== meta.length) writeMeta(list);

	return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(withPath);
}

export function registerAsset({ filename, originalName, kind, bytes }) {
	const meta = readMeta();
	const entry = {
		id: filename.replace(/\.[^.]+$/, ''),
		filename,
		originalName: originalName || filename,
		kind: kind || 'logo',
		bytes: bytes || 0,
		createdAt: Date.now()
	};
	meta.push(entry);
	writeMeta(meta);
	return withPath(entry);
}

export function renameAsset(id, originalName) {
	const meta = readMeta();
	const m = meta.find((x) => x.id === id);
	if (m) {
		m.originalName = String(originalName || m.originalName).slice(0, 80);
		writeMeta(meta);
	}
}

/** Deletes the file + metadata. Returns the removed asset's path (or null). */
export function deleteAsset(id) {
	const meta = readMeta();
	const m = meta.find((x) => x.id === id);
	if (!m) return null;
	try {
		fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(m.filename)));
	} catch {
		/* file may already be gone */
	}
	writeMeta(meta.filter((x) => x.id !== id));
	return '/uploads/' + m.filename;
}
