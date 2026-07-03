<script>
	import { store, emit, serverNow } from '$lib/socketClient.svelte.js';
	import { msToSeconds, remainingMsFrom } from '$lib/time.js';

	let s = $derived(store.state);

	let now = $state(serverNow());
	$effect(() => {
		const i = setInterval(() => (now = serverNow()), 100);
		return () => clearInterval(i);
	});
	let secondsLeft = $derived(msToSeconds(remainingMsFrom(s.shotClock, now)));
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Shot Clock</h2>

	<div
		class="font-timer tabular-nums mb-3 text-center"
		style="font-size:3.6rem; line-height:1; color:{s.shotClock.running ? '#f59e0b' : '#f4f6fb'};"
	>
		{secondsLeft}
	</div>

	<div class="grid grid-cols-3 gap-2">
		<button class="ctl-btn" style="background:#166534;" onclick={() => emit('shotClock:start')}>Start</button>
		<button class="ctl-btn" style="background:#854d0e;" onclick={() => emit('shotClock:stop')}>Stop</button>
		<button class="ctl-btn" onclick={() => emit('shotClock:reset')}>Reset</button>
	</div>
</section>
