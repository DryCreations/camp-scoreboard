<script>
	import { page } from '$app/stores';
	import { store, connect } from '$lib/socketClient.svelte.js';
	import { displayTypes } from '$lib/displayTypes.js';
	import SoundPlayer from '$lib/components/SoundPlayer.svelte';

	// ONE dynamic route for ALL displays. It finds this display's registry entry
	// by id, looks the entry's `type` up in the display-type registry, and
	// renders that component at the entry's exact pixel size. New display types
	// need a component + a registry line — never a new route.
	connect();

	let id = $derived($page.params.id);
	let entry = $derived(store.state?.displays.find((d) => d.id === id));
	let Component = $derived(entry ? displayTypes[entry.type] : null);
</script>

<!-- Plays trigger/soundboard audio on the display (gym speakers / OBS capture). -->
<SoundPlayer />

{#if !store.state}
	<div class="p-8 text-white/60">Connecting…</div>
{:else if !entry}
	<div class="p-8 text-white/60">Display not found: {id}</div>
{:else if !Component}
	<div class="p-8 text-white/60">Unknown display type: {entry.type}</div>
{:else}
	<Component {entry} state={store.state} trigger={store.trigger} />
{/if}
