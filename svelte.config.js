import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// This app is served over plain HTTP on the local network (any LAN IP), with
		// no accounts/auth — a trusted-LAN tool. adapter-node defaults the request
		// protocol to https when deriving the origin, so SvelteKit's CSRF origin
		// check would compare the browser's http:// Origin against a https:// origin
		// and reject every form POST (e.g. logo uploads return 403) in production —
		// even though it works in dev. There's no fixed ORIGIN we could pin (the IP
		// changes per machine), so we disable the origin check. Safe here because the
		// app already accepts unauthenticated control actions over the same LAN.
		csrf: { checkOrigin: false }
	}
};

export default config;
