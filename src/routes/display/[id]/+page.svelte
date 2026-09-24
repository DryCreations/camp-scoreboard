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

	// Displays render at their exact target size (what OBS and Novastar capture).
	// If the window is a different size (a 4K board opened on a 1080p screen, or a
	// pop-out window a few pixels short because of browser chrome), scale it to fit
	// and center it rather than cropping. At the exact size the scale is 1, so
	// correctly sized OBS sources are unchanged. Add ?fit=0 to turn this off.
	let viewW = $state(0);
	let viewH = $state(0);
	let fit = $derived($page.url.searchParams.get('fit') !== '0');
	let scale = $derived.by(() => {
		if (!fit || !entry || !viewW || !viewH) return 1;
		const s = Math.min(viewW / entry.targetWidth, viewH / entry.targetHeight);
		return Math.abs(s - 1) < 0.001 ? 1 : s;
	});
	let offsetX = $derived(entry ? Math.max(0, (viewW - entry.targetWidth * scale) / 2) : 0);
	let offsetY = $derived(entry ? Math.max(0, (viewH - entry.targetHeight * scale) / 2) : 0);
</script>

<svelte:window bind:innerWidth={viewW} bind:innerHeight={viewH} />

<!-- Plays trigger/soundboard audio on the display (gym speakers / OBS capture). -->
<SoundPlayer />

{#if !store.state}
	<div class="p-8 text-white/60">Connecting…</div>
{:else if !entry}
	<div class="p-8 text-white/60">Display not found: {id}</div>
{:else if !Component}
	<div class="p-8 text-white/60">Unknown display type: {entry.type}</div>
{:else if scale === 1}
	<Component {entry} state={store.state} trigger={store.trigger} />
{:else}
	<div style="position:fixed; inset:0; overflow:hidden;">
		<div
			style="position:absolute; left:{offsetX}px; top:{offsetY}px; transform:scale({scale}); transform-origin:0 0;"
		>
			<Component {entry} state={store.state} trigger={store.trigger} />
		</div>
	</div>
{/if}
