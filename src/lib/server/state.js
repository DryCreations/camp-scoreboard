import { randomUUID } from 'node:crypto';
import { loadConfig, saveConfig } from './config.js';
import { listSounds } from './sounds.js';

// The single authoritative state object. Live game values (score, clocks,
// fouls, overlay) are in-memory only and reset per game. settings/theme/
// displays/triggers mirror data/config.json and are persisted on every edit.
// Mutators here are pure state changes — they never touch sockets; socket.js
// calls them and rebroadcasts the result.

const config = loadConfig();

const DISPLAY_DEFAULTS = {
	scoreboard: { width: 3840, height: 2160 },
	clock: { width: 1152, height: 720 },
	score: { width: 1152, height: 720 }
};

function defaultResolutionForType(type) {
	return DISPLAY_DEFAULTS[type] ?? { width: 1152, height: 720 };
}

export const state = {
	score: { home: 0, away: 0 },
	fouls: { home: 0, away: 0 },
	// Both clocks store a target end-timestamp (not a ticking value) so every
	// client computes its own countdown locally and nothing drifts. While paused
	// we hold the frozen remaining ms; on start we convert it back to a targetEnd.
	timer: { targetEnd: null, running: false, remainingMs: 0, durationMs: 0 },
	// Shot clock is a plain, independent timer the operator starts/stops itself —
	// no auto lock/unlock tied to the game clock.
	shotClock: { targetEnd: null, running: false, remainingMs: 0, durationMs: 0 },
	period: 1,
	// Operator-controlled manual overlay — a simple on/off banner, no game logic.
	overlay: { active: false, label: null },
	// Persistent bottom ticker (news-broadcast style). In-memory, operator-driven.
	ticker: { active: false, text: '' },
	// Possession arrow — which team has the ball. Operator-toggled, in-memory.
	possession: { visible: false, direction: 'home' },
	// Available soundboard sounds, discovered from data/sounds/ at boot.
	sounds: listSounds(),
	settings: config.settings,
	theme: config.theme,
	displays: config.displays,
	triggers: config.triggers
};

// Shot clock duration comes from settings; seed the shot clock with it on boot.
resetShotClockToDuration();

function persist() {
	saveConfig({
		settings: state.settings,
		theme: state.theme,
		displays: state.displays,
		triggers: state.triggers
	});
}

/** Ms left on a clock right now (works whether running or paused). */
export function remainingOf(clock) {
	if (clock.running && clock.targetEnd != null) {
		return Math.max(0, clock.targetEnd - Date.now());
	}
	return clock.remainingMs;
}

// --- Score / fouls / period (in-memory) ---

export function adjustScore(side, delta) {
	if (side !== 'home' && side !== 'away') return;
	state.score[side] = Math.max(0, state.score[side] + delta);
}

export function setScore(side, value) {
	if (side !== 'home' && side !== 'away') return;
	state.score[side] = Math.max(0, Math.floor(value) || 0);
}

export function adjustFoul(side, delta) {
	if (side !== 'home' && side !== 'away') return;
	state.fouls[side] = Math.max(0, state.fouls[side] + delta);
}

export function adjustPeriod(delta) {
	state.period = Math.max(1, state.period + delta);
}

// --- Game clock (in-memory) ---

export function timerSet(ms) {
	const v = Math.max(0, Math.floor(ms) || 0);
	state.timer.running = false;
	state.timer.targetEnd = null;
	state.timer.remainingMs = v;
	state.timer.durationMs = v;
}

export function timerStart() {
	if (state.timer.running || state.timer.remainingMs <= 0) return;
	state.timer.running = true;
	state.timer.targetEnd = Date.now() + state.timer.remainingMs;
}

export function timerStop() {
	if (!state.timer.running) return;
	state.timer.remainingMs = remainingOf(state.timer);
	state.timer.running = false;
	state.timer.targetEnd = null;
}

export function timerReset() {
	state.timer.running = false;
	state.timer.targetEnd = null;
	state.timer.remainingMs = state.timer.durationMs;
}

export function timerExpire() {
	state.timer.running = false;
	state.timer.targetEnd = null;
	state.timer.remainingMs = 0;
}

// --- Shot clock (in-memory, independent) ---

export function resetShotClockToDuration() {
	const ms = (Number(state.settings?.shotClockDuration) || 24) * 1000;
	state.shotClock.running = false;
	state.shotClock.targetEnd = null;
	state.shotClock.remainingMs = ms;
	state.shotClock.durationMs = ms;
}

export function shotClockStart() {
	if (state.shotClock.running || state.shotClock.remainingMs <= 0) return;
	state.shotClock.running = true;
	state.shotClock.targetEnd = Date.now() + state.shotClock.remainingMs;
}

export function shotClockStop() {
	if (!state.shotClock.running) return;
	state.shotClock.remainingMs = remainingOf(state.shotClock);
	state.shotClock.running = false;
	state.shotClock.targetEnd = null;
}

export function shotClockReset() {
	resetShotClockToDuration();
}

export function shotClockExpire() {
	state.shotClock.running = false;
	state.shotClock.targetEnd = null;
	state.shotClock.remainingMs = 0;
}

// --- Overlay (in-memory) ---

export function overlayShow(label) {
	state.overlay = { active: true, label: label || null };
}

export function overlayHide() {
	state.overlay = { active: false, label: state.overlay.label };
}

// --- Ticker (in-memory) ---

export function tickerUpdate({ text, active }) {
	state.ticker = {
		text: text != null ? String(text) : state.ticker.text,
		active: active != null ? !!active : state.ticker.active
	};
}

// --- Possession (in-memory) ---

export function possessionUpdate({ visible, direction }) {
	state.possession = {
		visible: visible != null ? !!visible : state.possession.visible,
		direction: direction === 'home' || direction === 'away' ? direction : state.possession.direction
	};
}

// --- Sounds (rescan the folder on demand) ---

export function refreshSounds() {
	state.sounds = listSounds();
}

// --- Settings (persisted) ---

export function updateSettings(patch) {
	state.settings = { ...state.settings, ...patch };
	// Keep a stopped shot clock in sync with a newly configured duration.
	if (patch.shotClockDuration != null && !state.shotClock.running) {
		resetShotClockToDuration();
	}
	persist();
}

// --- Theme (persisted) ---

export function updateTheme(patch) {
	state.theme = { ...state.theme, ...patch };
	persist();
}

// --- Display registry (persisted) ---

export function addDisplay({ label, type, targetWidth, targetHeight }) {
	const resolvedType = type || 'scoreboard';
	const defaults = defaultResolutionForType(resolvedType);
	const entry = {
		id: randomUUID().slice(0, 8),
		label: label || 'New Display',
		type: resolvedType,
		targetWidth: Number(targetWidth) || defaults.width,
		targetHeight: Number(targetHeight) || defaults.height
	};
	state.displays = [...state.displays, entry];
	persist();
	return entry;
}

export function updateDisplay(id, patch) {
	state.displays = state.displays.map((d) =>
		d.id === id
			? {
					...d,
					...patch,
					...(patch.targetWidth != null ? { targetWidth: Number(patch.targetWidth) } : {}),
					...(patch.targetHeight != null ? { targetHeight: Number(patch.targetHeight) } : {})
				}
			: d
	);
	persist();
}

export function removeDisplay(id) {
	state.displays = state.displays.filter((d) => d.id !== id);
	persist();
}

export function findTrigger(id) {
	return state.triggers.find((t) => t.id === id);
}

// --- Triggers (persisted) --- edit a trigger's sound/animation/obs config.
export function updateTrigger(id, patch) {
	state.triggers = state.triggers.map((t) => (t.id === id ? { ...t, ...patch } : t));
	persist();
}
