<script>
	import { store } from '$lib/socketClient.svelte.js';

	// Plays soundboard/trigger sounds as real audio files from /sounds/<file>.
	// Displays mount it with enabled=true (gym speakers / OBS capture the audio).
	// The control device mounts it gated behind a per-device toggle (default off),
	// so the operator's phone stays silent unless they opt in.
	let { enabled = true } = $props();

	const cache = new Map();

	function play(file) {
		if (!enabled || !file || typeof Audio === 'undefined') return;
		let el = cache.get(file);
		if (!el) {
			el = new Audio('/sounds/' + encodeURIComponent(file));
			el.preload = 'auto';
			cache.set(file, el);
		}
		try {
			el.currentTime = 0;
			el.play().catch(() => {
				/* blocked until a gesture unlocks audio — ignore */
			});
		} catch {
			/* ignore */
		}
	}

	// React to every trigger:play (bumps store.trigger.seq). trigger.sound is a
	// filename (from the soundboard or a trigger definition) or null.
	let lastSeq = 0;
	$effect(() => {
		const seq = store.trigger?.seq ?? 0;
		if (seq === lastSeq) return;
		lastSeq = seq;
		play(store.trigger?.sound);
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const unlock = () => {
			// Nudge the audio subsystem awake with a muted no-op play.
			try {
				const a = new Audio();
				a.muted = true;
				a.play().catch(() => {});
			} catch {
				/* ignore */
			}
			window.removeEventListener('pointerdown', unlock);
			window.removeEventListener('keydown', unlock);
		};
		window.addEventListener('pointerdown', unlock);
		window.addEventListener('keydown', unlock);
		return () => {
			window.removeEventListener('pointerdown', unlock);
			window.removeEventListener('keydown', unlock);
		};
	});
</script>
