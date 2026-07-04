import 'dotenv/config';
import http from 'node:http';
import { attachSocket } from './src/lib/server/socket.js';

// adapter-node caps request bodies at 512KB by default, which silently blocks
// logo uploads in production (a phone photo easily exceeds it → 413). Raise it
// so uploads work; still overridable via .env. Must be set BEFORE the handler is
// imported, since adapter-node reads this env var at module-init time.
process.env.BODY_SIZE_LIMIT ||= '25M';

// Production entry (npm start, after npm run build). Boots the SvelteKit
// adapter-node handler and Socket.io on the SAME HTTP server/port, so one
// command runs everything. In dev, vite.config.js's plugin does the equivalent.
const { handler } = await import('./build/handler.js');

const port = Number(process.env.PORT) || 3000;

const server = http.createServer(handler);
attachSocket(server);

server.listen(port, () => {
	console.log(`camp-scoreboard listening on http://0.0.0.0:${port}`);
	console.log('Open /control on your phone/iPad; add /display/<id> URLs in OBS.');
});
