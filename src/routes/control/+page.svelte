<script>
	import { store, connect, emit } from '$lib/socketClient.svelte.js';
	import NavTabs from '$lib/components/control/NavTabs.svelte';
	import SoundPlayer from '$lib/components/SoundPlayer.svelte';
	import ScorePanel from '$lib/components/control/ScorePanel.svelte';
	import TimerPanel from '$lib/components/control/TimerPanel.svelte';
	import ShotClockPanel from '$lib/components/control/ShotClockPanel.svelte';
	import FoulsPanel from '$lib/components/control/FoulsPanel.svelte';
	import PossessionPanel from '$lib/components/control/PossessionPanel.svelte';
	import OverlayPanel from '$lib/components/control/OverlayPanel.svelte';
	import TriggerPanel from '$lib/components/control/TriggerPanel.svelte';
	import SoundboardPanel from '$lib/components/control/SoundboardPanel.svelte';
	import TickerPanel from '$lib/components/control/TickerPanel.svelte';
	import TeamSwapPanel from '$lib/components/control/TeamSwapPanel.svelte';
	import { onMount } from 'svelte';

	// Live board control. Everything here is per-play operation; branding, sounds,
	// displays and game-rule settings live on /settings to keep this view focused.
	connect();

	// Keyboard shortcuts for fast one-handed operation. Ignored while typing in a
	// field so form entry is unaffected.
	onMount(() => {
		const onKey = (e) => {
			const el = e.target;
			if (el && /^(input|textarea|select)$/i.test(el.tagName)) return;
			const running = store.state?.timer?.running;
			const down = e.shiftKey ? -1 : 1;
			switch (e.key) {
				case 'ArrowLeft': emit('score:adjust', { side: 'home', delta: down }); break;
				case 'ArrowRight': emit('score:adjust', { side: 'away', delta: down }); break;
				case '[': emit('foul:adjust', { side: 'home', delta: down }); break;
				case ']': emit('foul:adjust', { side: 'away', delta: down }); break;
				case ' ': emit(running ? 'timer:stop' : 'timer:start'); break;
				case 's': case 'S': emit('team:swap'); break;
				default: return;
			}
			e.preventDefault();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<svelte:head><title>Control - Camp Scoreboard</title></svelte:head>

<!-- Off by default: the control device stays silent unless the operator opts in
     via the Soundboard toggle. Displays play regardless. -->
<SoundPlayer enabled={store.localAudio} />

<div class="mx-auto w-full max-w-xl p-3 pb-20 md:max-w-4xl md:px-5 xl:max-w-6xl">
	<NavTabs />

	{#if store.state}
		<!-- Masonry: single column on phones, 2 on tablets, 3 on desktop. Cards keep
		     their intrinsic height and pack tightly. -->
		<div class="gap-4 md:columns-2 xl:columns-3">
			{#each [ScorePanel, TimerPanel, ShotClockPanel, FoulsPanel, PossessionPanel, OverlayPanel, TriggerPanel, TickerPanel, SoundboardPanel, TeamSwapPanel] as Panel}
				<div class="mb-4 break-inside-avoid"><Panel /></div>
			{/each}
		</div>
	{:else}
		<p class="text-white/60">Connecting…</p>
	{/if}
</div>
