/** Format milliseconds as MM:SS (clamped at zero, minutes can exceed 99). */
export function msToClock(ms) {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format a shot clock as whole seconds (e.g. "24", "5"). */
export function msToSeconds(ms) {
	return String(Math.max(0, Math.ceil(ms / 1000)));
}

/** Live remaining ms from a clock snapshot — running counts down from targetEnd. */
export function remainingMsFrom(clock, now = Date.now()) {
	if (!clock) return 0;
	if (clock.running && clock.targetEnd != null) return Math.max(0, clock.targetEnd - now);
	return clock.remainingMs ?? 0;
}
