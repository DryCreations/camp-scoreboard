import { io } from 'socket.io-client';
import { browser } from '$app/environment';

// Shared reactive client state. Every page (control panel + displays) imports
// this, calls connect() once, and reads `store.state` — the full authoritative
// snapshot pushed by the server. Svelte 5 runes make it reactive everywhere.
export const store = $state({
	connected: false,
	/** @type {any} full server snapshot: score, fouls, clocks, overlay, settings, theme, displays, triggers */
	state: null,
	/** Bumped whenever the server fires a trigger, so displays can react. */
	trigger: { id: null, animation: null, sound: null, seq: 0 },
	/** Live OBS remote state: scene list, current scene, sources in it. */
	obs: { connected: false, scenes: [], currentScene: null, selectedScene: null, sources: [] },
	/** ms to add to this device's Date.now() to match the SERVER clock. This is
	 *  what keeps every client's countdown in sync even when device system clocks
	 *  are skewed by seconds relative to each other. */
	clockOffset: 0,
	/** Per-device preference: play soundboard/trigger audio on THIS device.
	 *  Off by default — normally only the displays (OBS / gym speakers) make noise. */
	localAudio: false
});

let socket = null;

// --- Server-clock sync -------------------------------------------------------
// Clients compute countdowns from the timer's server-issued `targetEnd`, so they
// must agree with the SERVER's clock, not their own (a phone can be several
// seconds off). We estimate the offset with a small ping burst and keep the
// sample with the lowest round-trip time (least latency error).
let bestRtt = Infinity;

function handleTimeSync({ t0, t1 }) {
	const t2 = Date.now();
	const rtt = t2 - t0;
	if (rtt <= bestRtt) {
		bestRtt = rtt;
		// Server time at the midpoint of the round-trip ≈ t1; our local midpoint is
		// (t0+t2)/2. Offset converts local now -> server now.
		store.clockOffset = Math.round(t1 - (t0 + t2) / 2);
	}
}

function syncBurst() {
	if (!socket) return;
	bestRtt = Infinity; // re-evaluate from scratch each burst
	for (let i = 0; i < 5; i++) {
		setTimeout(() => socket?.emit('time:sync', Date.now()), i * 120);
	}
}

/** Current time on the SERVER's clock (local time corrected by the sync offset). */
export function serverNow() {
	return Date.now() + store.clockOffset;
}

export function connect() {
	if (!browser || socket) return;

	// Restore this device's audio preference.
	try {
		store.localAudio = localStorage.getItem('localAudio') === '1';
	} catch {
		/* ignore */
	}

	// Same-origin: Socket.io shares the app's host/port, so no URL needed.
	socket = io();

	socket.on('connect', () => {
		store.connected = true;
		syncBurst();
	});
	socket.on('disconnect', () => {
		store.connected = false;
	});
	socket.on('state', (snapshot) => {
		store.state = snapshot;
	});
	socket.on('obs:state', (obs) => {
		store.obs = obs;
	});
	socket.on('trigger:play', ({ id, animation, sound }) => {
		store.trigger = { id, animation, sound, seq: store.trigger.seq + 1 };
	});
	socket.on('time:sync', handleTimeSync);

	// Periodically re-sync to correct slow clock drift over a long game.
	setInterval(syncBurst, 20_000);
}

export function setLocalAudio(on) {
	store.localAudio = !!on;
	try {
		localStorage.setItem('localAudio', on ? '1' : '0');
	} catch {
		/* ignore */
	}
}

export function emit(event, payload) {
	socket?.emit(event, payload);
}
