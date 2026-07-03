// Resolve a stored logo value to a usable <img src>. A logo can be:
//  - an uploaded file  -> "/uploads/xyz.png"  (already server-rooted, use as-is)
//  - a data/http(s) URL -> use as-is
//  - a local filesystem path on the server machine -> served via /api/file
//    (the manual fallback for images that already live on the host).
export function logoSrc(value) {
	if (!value) return '';
	if (/^(https?:|data:|blob:|\/)/i.test(value)) return value;
	return '/api/file?path=' + encodeURIComponent(value);
}
