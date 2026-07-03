import { findTrigger } from './state.js';
import { runObsAction } from './obs.js';

// One pipeline for every trigger, whether fired by a control-panel button or
// automatically by a clock hitting zero: broadcast the animation/sound to all
// displays, then attempt the optional OBS action. OBS runs fire-and-forget so a
// slow/offline OBS can never delay the display broadcast.
export function fireTrigger(io, id) {
	const trigger = findTrigger(id);
	if (!trigger) {
		console.warn('[trigger] unknown trigger:', id);
		return;
	}

	// Displays play the animation/sound for a fixed duration then auto-clear.
	// A display type with no matching animation simply ignores it — a no-op.
	io.emit('trigger:play', {
		id: trigger.id,
		animation: trigger.animation,
		sound: trigger.sound ?? null
	});

	if (trigger.obs && trigger.obs.action && trigger.obs.action !== 'none') {
		runObsAction(trigger.obs).catch((err) =>
			console.warn('[trigger] obs action error:', err?.message ?? err)
		);
	}
}
