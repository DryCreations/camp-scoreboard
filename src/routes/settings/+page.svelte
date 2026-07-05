<script>
	import { store, connect } from '$lib/socketClient.svelte.js';
	import NavTabs from '$lib/components/control/NavTabs.svelte';
	import SoundPlayer from '$lib/components/SoundPlayer.svelte';
	import AppearancePanel from '$lib/components/control/AppearancePanel.svelte';
	import AssetLibrary from '$lib/components/control/AssetLibrary.svelte';
	import ThemeEditor from '$lib/components/control/ThemeEditor.svelte';
	import SoundsSettings from '$lib/components/control/SoundsSettings.svelte';
	import GameSettings from '$lib/components/control/GameSettings.svelte';
	import DisplaysManager from '$lib/components/control/DisplaysManager.svelte';

	// Visual + sound configuration, separated from the live control view so the
	// board remote stays uncluttered. Everything here persists to config.json.
	connect();
</script>

<svelte:head><title>Settings - Camp Scoreboard</title></svelte:head>

<!-- Same as /control: silent on this device unless opted in (previews on the
     Sounds card play regardless, since those are explicit taps). -->
<SoundPlayer enabled={store.localAudio} />

<div class="mx-auto w-full max-w-xl p-3 pb-20 md:max-w-4xl md:px-5 xl:max-w-6xl">
	<NavTabs />

	{#if store.state}
		<div class="gap-4 md:columns-2 xl:columns-3">
			{#each [AppearancePanel, AssetLibrary, ThemeEditor, SoundsSettings, GameSettings, DisplaysManager] as Panel}
				<div class="mb-4 break-inside-avoid"><Panel /></div>
			{/each}
		</div>
	{:else}
		<p class="text-white/60">Connecting…</p>
	{/if}
</div>
