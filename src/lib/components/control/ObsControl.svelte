<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Direct, live OBS remote — separate from automated triggers. Scenes and
	// sources are discovered from OBS itself (never hand-typed). OBS runs on the
	// same machine as the server (127.0.0.1). If OBS is unreachable we show a
	// clear disconnected state instead of erroring.
	let obs = $derived(store.obs);

	function setScene(scene) {
		emit('obs:setScene', { scene });
	}
	function toggleSource(source, enabled) {
		emit('obs:toggleSource', { scene: obs.currentScene, source, enabled: !enabled });
	}
</script>

<section class="ctl-card">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="ctl-h">OBS Control</h2>
		<div class="flex items-center gap-2">
			<span
				class="rounded-full px-3 py-1 text-xs font-semibold"
				style={obs.connected ? 'background:#166534;color:#dcfce7;' : 'background:#7f1d1d;color:#fecaca;'}
			>
				{obs.connected ? 'Connected' : 'Not connected'}
			</span>
			<button class="ctl-btn !px-3 !py-1 text-sm" onclick={() => emit('obs:refresh')}>Refresh</button>
		</div>
	</div>

	{#if !obs.connected}
		<p class="text-sm text-white/50">
			OBS isn't reachable. Start OBS and enable its WebSocket server (Tools → WebSocket Server
			Settings), then tap Refresh.
		</p>
	{:else}
		<div class="mb-3">
			<div class="mb-2 text-xs text-white/40">Scenes — tap to switch live</div>
			<div class="grid grid-cols-2 gap-2">
				{#each obs.scenes as scene}
					<button
						class="ctl-btn truncate"
						style={scene === obs.currentScene ? 'background:#1d4ed8;' : ''}
						onclick={() => setScene(scene)}
						title={scene}>{scene}</button
					>
				{/each}
			</div>
		</div>

		<div>
			<div class="mb-2 text-xs text-white/40">
				Sources in “{obs.currentScene ?? '—'}” — tap to toggle
			</div>
			<div class="flex flex-col gap-2">
				{#each obs.sources as src}
					<button
						class="ctl-btn flex items-center justify-between"
						onclick={() => toggleSource(src.name, src.enabled)}
					>
						<span class="truncate">{src.name}</span>
						<span
							class="ml-2 rounded px-2 py-0.5 text-xs"
							style={src.enabled ? 'background:#166534;color:#dcfce7;' : 'background:#3a3f4b;color:#9aa4b2;'}
						>
							{src.enabled ? 'On' : 'Off'}
						</span>
					</button>
				{:else}
					<span class="text-sm text-white/40">No sources in this scene.</span>
				{/each}
			</div>
		</div>
	{/if}
</section>
