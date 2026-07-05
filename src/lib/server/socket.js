import { Server } from 'socket.io';
import * as S from './state.js';
import { fireTrigger } from './triggers.js';
import {
	toggleSource,
	fetchObsState,
	upsertBrowserSource,
	setSourcesVisibilityBatch,
	applyManagedWallLayout
} from './obs.js';

// Triggers fired automatically when a clock reaches zero.
const END_OF_TIMER_TRIGGER = 'buzzer';
const SHOT_CLOCK_TRIGGER = 'shot_clock_violation';

let io = null;

/**
 * Attach Socket.io to an existing HTTP server. Called from the Vite dev plugin
 * during `npm run dev` and from server.js in production — one code path either
 * way. Guarded so it only ever attaches once per process.
 */
export function attachSocket(httpServer) {
	if (io) return io;
	io = new Server(httpServer);

	io.on('connection', (socket) => {
		// New client (control panel or a display) gets the full state immediately,
		// plus a fresh OBS snapshot for the control panel's live remote.
		socket.emit('state', snapshot());
		fetchObsState().then((s) => socket.emit('obs:state', s));

		// Clock sync: echo the client's t0 back with the server's current time so
		// the client can compute its offset from the SERVER clock. This is what
		// keeps countdowns identical across devices with skewed system clocks.
		socket.on('time:sync', (t0) => {
			socket.emit('time:sync', { t0, t1: Date.now() });
		});

		// --- Score / fouls / period ---
		socket.on('score:adjust', ({ side, delta }) => {
			S.adjustScore(side, delta);
			broadcast();
		});
		socket.on('score:set', ({ side, value }) => {
			S.setScore(side, value);
			broadcast();
		});
		socket.on('foul:adjust', ({ side, delta }) => {
			S.adjustFoul(side, delta);
			broadcast();
		});
		socket.on('period:adjust', ({ delta }) => {
			S.adjustPeriod(delta);
			broadcast();
		});

		// --- Game clock ---
		socket.on('timer:set', ({ ms }) => {
			S.timerSet(ms);
			broadcast();
		});
		socket.on('timer:start', () => {
			S.timerStart();
			broadcast();
		});
		socket.on('timer:stop', () => {
			S.timerStop();
			broadcast();
		});
		socket.on('timer:reset', () => {
			S.timerReset();
			broadcast();
		});

		// --- Shot clock (independent) ---
		socket.on('shotClock:start', () => {
			S.shotClockStart();
			broadcast();
		});
		socket.on('shotClock:stop', () => {
			S.shotClockStop();
			broadcast();
		});
		socket.on('shotClock:reset', () => {
			S.shotClockReset();
			broadcast();
		});

		// --- Overlay ---
		socket.on('overlay:show', ({ label }) => {
			S.overlayShow(label);
			broadcast();
		});
		socket.on('overlay:hide', () => {
			S.overlayHide();
			broadcast();
		});

		// --- Settings / theme (persisted) ---
		socket.on('settings:update', (patch) => {
			S.updateSettings(patch);
			broadcast();
		});
		socket.on('theme:update', (patch) => {
			S.updateTheme(patch);
			broadcast();
		});
		socket.on('preset:apply', ({ id }) => {
			S.applyPreset(id);
			broadcast();
		});
		socket.on('team:swap', () => {
			S.swapTeams();
			broadcast();
		});

		// --- Asset library ---
		socket.on('assets:refresh', () => {
			S.refreshAssets();
			broadcast();
		});
		socket.on('asset:rename', ({ id, name }) => {
			S.renameAsset(id, name);
			broadcast();
		});
		socket.on('asset:delete', ({ id }) => {
			S.deleteAsset(id);
			broadcast();
		});

		// --- Display registry (persisted) ---
		socket.on('display:add', (entry) => {
			S.addDisplay(entry);
			broadcast();
		});
		socket.on('display:update', ({ id, patch }) => {
			S.updateDisplay(id, patch);
			broadcast();
		});
		socket.on('display:remove', ({ id }) => {
			S.removeDisplay(id);
			broadcast();
		});

		// --- Triggers ---
		socket.on('trigger:fire', ({ id }) => {
			fireTrigger(io, id);
		});
		socket.on('trigger:update', ({ id, patch }) => {
			S.updateTrigger(id, patch);
			broadcast();
		});

		// --- Soundboard (one-shot sounds) --- routed through the same trigger:play
		// channel the clients already listen on, so it plays everywhere.
		socket.on('sound:play', ({ file }) => {
			io.emit('trigger:play', { id: null, animation: null, sound: file });
		});
		socket.on('sounds:refresh', () => {
			S.refreshSounds();
			broadcast();
		});

		// --- Ticker (persistent bottom scroll) ---
		socket.on('ticker:update', (patch) => {
			S.tickerUpdate(patch);
			broadcast();
		});

		// --- Possession arrow ---
		socket.on('possession:update', (patch) => {
			S.possessionUpdate(patch);
			broadcast();
		});

		// --- OBS live control (direct manual switching, separate from triggers) ---
		socket.on('obs:refresh', async ({ scene } = {}) => {
			socket.emit('obs:state', await fetchObsState(scene));
		});
		socket.on('obs:inspectScene', async ({ scene }) => {
			socket.emit('obs:state', await fetchObsState(scene));
		});
		socket.on('obs:toggleSource', async ({ scene, source, enabled }) => {
			await toggleSource(scene, source, enabled);
			io.emit('obs:state', await fetchObsState(scene));
		});
		socket.on('obs:upsertBrowserSource', async ({ scene, source, url, width, height }) => {
			await upsertBrowserSource({
				sceneName: scene,
				sourceName: source,
				url,
				width,
				height
			});
			io.emit('obs:state', await fetchObsState(scene));
		});
		socket.on('obs:setSourcesVisibility', async ({ scene, updates }) => {
			await setSourcesVisibilityBatch(scene, updates);
			io.emit('obs:state', await fetchObsState(scene));
		});
		socket.on('obs:quickSetupWall', async ({ scene, items = [] }) => {
			await applyManagedWallLayout(scene, items);
			io.emit('obs:state', await fetchObsState(scene));
		});
	});

	startClockLoop();
	return io;
}

function snapshot() {
	return {
		score: S.state.score,
		fouls: S.state.fouls,
		timer: S.state.timer,
		shotClock: S.state.shotClock,
		period: S.state.period,
		overlay: S.state.overlay,
		ticker: S.state.ticker,
		possession: S.state.possession,
		sounds: S.state.sounds,
		assets: S.state.assets,
		settings: S.state.settings,
		theme: S.state.theme,
		displays: S.state.displays,
		triggers: S.state.triggers,
		presets: S.state.presets,
		activePreset: S.state.activePreset
	};
}

function broadcast() {
	io.emit('state', snapshot());
}

// Server-authoritative clock watchdog. It doesn't tick the clocks (clients do
// that locally from targetEnd) — it only watches for expiry, then fires the
// matching trigger pipeline, regardless of how many displays are connected.
function startClockLoop() {
	setInterval(() => {
		let changed = false;
		if (S.state.timer.running && S.remainingOf(S.state.timer) <= 0) {
			S.timerExpire();
			changed = true;
			fireTrigger(io, END_OF_TIMER_TRIGGER);
		}
		if (S.state.shotClock.running && S.remainingOf(S.state.shotClock) <= 0) {
			S.shotClockExpire();
			changed = true;
			fireTrigger(io, SHOT_CLOCK_TRIGGER);
		}
		if (changed) broadcast();
	}, 200);
}
