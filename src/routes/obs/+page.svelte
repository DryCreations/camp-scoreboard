<script>
	import { store, connect } from '$lib/socketClient.svelte.js';
	import NavTabs from '$lib/components/control/NavTabs.svelte';
	import SoundPlayer from '$lib/components/SoundPlayer.svelte';
	import ObsControl from '$lib/components/control/ObsControl.svelte';

	// Dedicated OBS operations view: scene/source visibility, managed wall setup,
	// and per-screen scene controls, separated from live game operation cards.
	connect();
</script>

<svelte:head><title>OBS - Camp Scoreboard</title></svelte:head>

<!-- Same audio policy as other operator pages: this device is silent unless
     localAudio is enabled in the soundboard controls. -->
<SoundPlayer enabled={store.localAudio} />

<div class="mx-auto max-w-xl p-3 pb-20">
	<NavTabs />

	{#if store.state}
		<div class="space-y-4">
			<ObsControl />
		</div>
	{:else}
		<p class="text-white/60">Connecting…</p>
	{/if}
</div>
