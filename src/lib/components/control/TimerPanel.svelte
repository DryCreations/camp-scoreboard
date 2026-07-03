<script>
	import { store, emit, serverNow } from '$lib/socketClient.svelte.js';
	import { msToClock, remainingMsFrom } from '$lib/time.js';

	let s = $derived(store.state);

	// Live preview of the countdown, ticking against the SERVER clock so this
	// phone/tablet matches the displays exactly (no device-clock drift).
	let now = $state(serverNow());
	$effect(() => {
		const i = setInterval(() => (now = serverNow()), 200);
		return () => clearInterval(i);
	});
	let clock = $derived(msToClock(remainingMsFrom(s.timer, now)));

	let mins = $state(10);
	let secs = $state(0);

	function setTimer() {
		emit('timer:set', { ms: (Number(mins) * 60 + Number(secs)) * 1000 });
	}
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Game Clock</h2>

	<div
		class="font-timer tabular-nums mb-3 text-center"
		style="font-size:3.6rem; line-height:1; color:{s.timer.running ? '#22c55e' : '#f4f6fb'};"
	>
		{clock}
	</div>

	<div class="mb-3 grid grid-cols-3 gap-2">
		<button class="ctl-btn" style="background:#166534;" onclick={() => emit('timer:start')}>Start</button>
		<button class="ctl-btn" style="background:#854d0e;" onclick={() => emit('timer:stop')}>Stop</button>
		<button class="ctl-btn" onclick={() => emit('timer:reset')}>Reset</button>
	</div>

	<div class="flex items-end gap-2">
		<label class="flex-1 text-xs text-white/50">
			Min
			<input type="number" min="0" bind:value={mins} class="ctl-input mt-1 w-full text-lg" />
		</label>
		<label class="flex-1 text-xs text-white/50">
			Sec
			<input type="number" min="0" max="59" bind:value={secs} class="ctl-input mt-1 w-full text-lg" />
		</label>
		<button class="ctl-btn" onclick={setTimer}>Set</button>
	</div>

	<div class="mt-3 flex items-center justify-between rounded-xl p-3" style="background:#0c0f15;">
		<span class="ctl-h">Period</span>
		<div class="flex items-center gap-3">
			<button class="ctl-btn h-12 w-12 !p-0 text-2xl" onclick={() => emit('period:adjust', { delta: -1 })}
				>−</button
			>
			<span class="font-timer w-8 text-center text-3xl">{s.period}</span>
			<button class="ctl-btn h-12 w-12 !p-0 text-2xl" onclick={() => emit('period:adjust', { delta: 1 })}
				>+</button
			>
		</div>
	</div>
</section>
