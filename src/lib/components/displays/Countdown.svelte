<script>
	import { msToClock, msToSeconds, remainingMsFrom } from '$lib/time.js';
	import { serverNow } from '$lib/socketClient.svelte.js';

	// Renders a live countdown. The server only sends a clock snapshot
	// (targetEnd / remainingMs); each client ticks locally against the SERVER's
	// clock (serverNow) so all devices stay in sync even with skewed system clocks.
	// format: 'clock' -> MM:SS (game clock), 'seconds' -> whole seconds (shot clock).
	let { timer, format = 'clock' } = $props();

	let now = $state(serverNow());

	$effect(() => {
		const i = setInterval(() => (now = serverNow()), 100);
		return () => clearInterval(i);
	});

	let ms = $derived(remainingMsFrom(timer, now));
	let text = $derived(format === 'seconds' ? msToSeconds(ms) : msToClock(ms));
</script>

{text}
