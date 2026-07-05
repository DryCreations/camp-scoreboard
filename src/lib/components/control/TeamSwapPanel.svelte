<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// One-tap Home↔Away swap: flips names, colors, logos, score, fouls and
	// possession on every display at once. Confirms first if the game clock is
	// running, to avoid an accidental swap mid-play.
	let s = $derived(store.state);
	let live = $derived(!!s.timer?.running);
	let confirming = $state(false);

	function doSwap() {
		emit('team:swap');
		confirming = false;
	}
	function onClick() {
		if (live && !confirming) {
			confirming = true;
			return;
		}
		doSwap();
	}
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Teams</h2>
	<div class="mb-3 flex items-center justify-center gap-3 text-sm">
		<span class="font-timer" style="color:{s.theme.homeColor};">{s.theme.homeName}</span>
		<span class="text-white/40">⇄</span>
		<span class="font-timer" style="color:{s.theme.awayColor};">{s.theme.awayName}</span>
	</div>
	<button class="ctl-btn w-full" style={confirming ? 'background:#7f1d1d;' : ''} onclick={onClick}>
		{confirming ? 'Tap again to confirm swap' : 'Swap sides'}
	</button>
	{#if confirming}
		<button class="ctl-btn mt-2 w-full !py-2 text-sm" onclick={() => (confirming = false)}>Cancel</button>
	{/if}
	<p class="mt-2 text-center text-xs text-white/40">Swaps names, colors, logos, score & fouls.</p>
</section>
