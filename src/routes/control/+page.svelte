<script>
	import { store, connect } from '$lib/socketClient.svelte.js';
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

	// Live board control. Everything here is per-play operation; branding, sounds,
	// displays and game-rule settings live on /settings to keep this view focused.
	connect();
</script>

<svelte:head><title>Control — Camp Scoreboard</title></svelte:head>

<!-- Off by default: the control device stays silent unless the operator opts in
     via the Soundboard toggle. Displays play regardless. -->
<SoundPlayer enabled={store.localAudio} />

<div class="mx-auto max-w-xl p-3 pb-20">
	<NavTabs />

	{#if store.state}
		<div class="space-y-4">
			<ScorePanel />
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<TimerPanel />
				<ShotClockPanel />
			</div>
			<FoulsPanel />
			<PossessionPanel />
			<OverlayPanel />
			<TickerPanel />
			<TriggerPanel />
			<SoundboardPanel />
		</div>
	{:else}
		<p class="text-white/60">Connecting…</p>
	{/if}
</div>
