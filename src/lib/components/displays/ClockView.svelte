<script>
	import DisplayBase from './displayBase.svelte';
	import Countdown from './Countdown.svelte';
	import { msToSeconds, remainingMsFrom } from '$lib/time.js';
	import { serverNow } from '$lib/socketClient.svelte.js';

	// Minimal secondary screen: the game clock as hero, with period and the
	// shot clock as supporting readouts. Centered on dark chrome with team color accents.
	let { entry, state: gameState, trigger } = $props();
	let theme = $derived(gameState.theme);

	let currentTimeMs = $state(serverNow());

	$effect(() => {
		const i = setInterval(() => (currentTimeMs = serverNow()), 100);
		return () => clearInterval(i);
	});

	let shotClockSeconds = $derived(msToSeconds(remainingMsFrom(gameState.shotClock, currentTimeMs)));
</script>

<DisplayBase {entry} {theme} {trigger} overlay={gameState.overlay} ticker={gameState.ticker} overlayPlacement="center">
	<div class="led-grid flex h-full w-full flex-col items-center justify-center relative">
		<!-- Top stripe with team colors (home on left, away on right) -->
		<div style="position:absolute; top:0; left:0; right:0; height:1cqh; display:flex; gap:0; z-index:5;">
			<div style="flex:1; background:{theme.homeColor};"></div>
			<div style="flex:1; background:{theme.awayColor};"></div>
		</div>

		<div class="flex flex-col items-center" style="margin-top:2cqh; gap:var(--sb-clock-display-gap);">
			<div class="font-timer tabular-nums" style="font-size:44cqh; line-height:0.85; color:#ffffff; text-shadow:0 0 calc(3cqh * var(--sb-glow)) rgba(120,170,255,0.5);">
				<Countdown timer={gameState.timer} />
			</div>
			<!-- amber underline accent, matching the main scoreboard clock -->
			<div style="width:16cqw; height:0.7cqh; margin-top:var(--sb-clock-display-offset); background:#f59e0b; border-radius:0.35cqh; box-shadow:0 0 calc(var(--sb-clock-accent-glow) * 1.2 * var(--sb-glow)) #f59e0b;"></div>
		</div>
		<div class="flex items-end" style="margin-top:4cqh; gap:6cqw; min-height:15cqh;">
			<div class="flex flex-col items-center">
				<span class="font-label" style="font-size:3.5cqh; color:#7c8698;">Period</span>
				<span class="font-timer" style="font-size:11cqh; line-height:1;">{gameState.period}</span>
			</div>
			{#if gameState.shotClock.running}
				<div class="flex flex-col items-center" style="gap:0.2cqh;">
					<div class="font-label" style="font-size:3.5cqh; color:#f59e0b;">SHOT</div>
					<div class="font-timer tabular-nums" style="font-size:11cqh; line-height:1; color:#f59e0b;">
						{shotClockSeconds}
					</div>
				</div>
			{/if}
		</div>
	</div>
</DisplayBase>
