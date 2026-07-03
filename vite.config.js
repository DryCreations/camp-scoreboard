import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/**
 * Dev-only plugin: attach Socket.io to Vite's underlying HTTP server so realtime
 * sync works during `npm run dev` with full HMR. In production the same
 * `attachSocket` logic runs from server.js instead (see server.js). Keeping the
 * socket wiring in one shared module means dev and prod behave identically.
 */
const socketIoDev = {
	name: 'socket-io-dev',
	async configureServer(server) {
		if (!server.httpServer) return;
		const { attachSocket } = await import('./src/lib/server/socket.js');
		attachSocket(server.httpServer);
	}
};

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), socketIoDev]
});
