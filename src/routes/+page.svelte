<script>
	import { store, connect } from '$lib/socketClient.svelte.js';
	connect();
</script>

<svelte:head><title>Camp Scoreboard</title></svelte:head>

<div class="mx-auto max-w-xl p-6">
	<h1 class="mb-2 text-2xl font-black">Camp Scoreboard</h1>
	<p class="mb-6 text-white/60">
		Open the <a href="/control" class="text-indigo-400 underline">control panel</a> to run the game.
		Displays are listed below — add them as OBS Browser Sources or pop them out.
	</p>

	{#if store.state}
		<ul class="space-y-2">
			{#each store.state.displays as d}
				<li class="flex items-center justify-between rounded-xl bg-white/5 p-3">
					<div>
						<div class="font-semibold">{d.label}</div>
						<div class="text-xs text-white/50">{d.type} · {d.targetWidth}×{d.targetHeight}</div>
					</div>
					<a href="/display/{d.id}" class="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold"
						>Open</a
					>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-white/60">Connecting…</p>
	{/if}
</div>
