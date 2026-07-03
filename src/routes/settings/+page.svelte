<script>
	import { store, connect } from '$lib/socketClient.svelte.js';
	import NavTabs from '$lib/components/control/NavTabs.svelte';
	import SoundPlayer from '$lib/components/SoundPlayer.svelte';
	import ThemeEditor from '$lib/components/control/ThemeEditor.svelte';
	import SoundsSettings from '$lib/components/control/SoundsSettings.svelte';
	import GameSettings from '$lib/components/control/GameSettings.svelte';
	import DisplaysManager from '$lib/components/control/DisplaysManager.svelte';

	// Visual + sound configuration, separated from the live control view so the
	// board remote stays uncluttered. Everything here persists to config.json.
	connect();
</script>

<svelte:head><title>Settings — Camp Scoreboard</title></svelte:head>

<!-- Same as /control: silent on this device unless opted in (previews on the
     Sounds card play regardless, since those are explicit taps). -->
<SoundPlayer enabled={store.localAudio} />

<div class="mx-auto max-w-xl p-3 pb-20">
	<NavTabs />

	{#if store.state}
		<div class="space-y-4">
			<ThemeEditor />
			<SoundsSettings />
			<GameSettings />
			<DisplaysManager />
		</div>
	{:else}
		<p class="text-white/60">Connecting…</p>
	{/if}
</div>
