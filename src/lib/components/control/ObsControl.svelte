<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Direct, live OBS remote — separate from automated triggers. Scenes and
	// sources are discovered from OBS itself (never hand-typed). OBS runs on the
	// same machine as the server (127.0.0.1). If OBS is unreachable we show a
	// clear disconnected state instead of erroring.
	let obs = $derived(store.obs);
	let displays = $derived(store.state?.displays ?? []);
	let sourceNames = $state({});
	let wallWidth = $state(6144);
	let wallHeight = $state(2160);
	let wallGap = $state(0);

	$effect(() => {
		const next = { ...sourceNames };
		let changed = false;
		for (const d of displays) {
			if (!next[d.id]) {
				next[d.id] = `camp-${d.id}`;
				changed = true;
			}
		}
		if (changed) sourceNames = next;
	});

	function inspectScene(scene) {
		emit('obs:inspectScene', { scene });
	}
	function toggleSource(source, enabled) {
		emit('obs:toggleSource', {
			scene: obs.selectedScene || obs.currentScene,
			source,
			enabled: !enabled
		});
	}
	function refresh() {
		emit('obs:refresh', { scene: obs.selectedScene || obs.currentScene });
	}

	function setSourceName(id, name) {
		sourceNames = { ...sourceNames, [id]: name };
	}

	function displayUrl(id) {
		return `${location.origin}/display/${id}`;
	}

	function autoSetupBrowserSource(display) {
		emit('obs:upsertBrowserSource', {
			scene: obs.selectedScene || obs.currentScene,
			source: sourceNames[display.id] || `camp-${display.id}`,
			url: displayUrl(display.id),
			width: display.targetWidth,
			height: display.targetHeight
		});
	}

	function orderedDisplays() {
		const priority = { scoreboard: 0, clock: 1, score: 2 };
		return [...displays].sort((a, b) => {
			const pa = priority[a.type] ?? 99;
			const pb = priority[b.type] ?? 99;
			if (pa !== pb) return pa - pb;
			return a.label.localeCompare(b.label);
		});
	}

	function buildWallItems() {
		let x = 0;
		return orderedDisplays().map((d) => {
			const item = {
				displayId: d.id,
				source: sourceNames[d.id] || `camp-${d.id}`,
				url: displayUrl(d.id),
				width: d.targetWidth,
				height: d.targetHeight,
				x,
				y: 0,
				scaleX: 1,
				scaleY: 1,
				cropTop: 0,
				cropBottom: 0,
				cropLeft: 0,
				cropRight: 0,
				enabled: true
			};
			x += d.targetWidth + wallGap;
			return item;
		});
	}

	function quickSetupWall() {
		emit('obs:quickSetupWall', {
			scene: obs.selectedScene || obs.currentScene,
			canvasWidth: wallWidth,
			canvasHeight: wallHeight,
			items: buildWallItems()
		});
	}

	function setCampSourcesOnly(enabled) {
		const scene = obs.selectedScene || obs.currentScene;
		if (!scene) return;
		const campNames = new Set(buildWallItems().map((i) => i.source));
		const updates = (obs.sources || []).map((src) => ({
			source: src.name,
			enabled: enabled ? campNames.has(src.name) : !campNames.has(src.name)
		}));
		emit('obs:setSourcesVisibility', { scene, updates });
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
			<button class="ctl-btn !px-3 !py-1 text-sm" onclick={refresh}>Refresh</button>
		</div>
	</div>

	{#if !obs.connected}
		<p class="text-sm text-white/50">
			OBS isn't reachable. Start OBS and enable its WebSocket server (Tools → WebSocket Server
			Settings), then tap Refresh.
		</p>
	{:else}
		<div class="mb-3 rounded-xl border p-3" style="border-color:var(--chrome-line);">
			<div class="mb-1 text-xs text-white/40">Selected control scene</div>
			<div class="text-sm text-white/85">{obs.selectedScene || obs.currentScene || '—'}</div>
			<div class="mt-2 text-xs text-white/45">
				Use your Main Scene here to toggle subscene sources, or choose a subscene to auto-configure browser
				sources.
			</div>
		</div>

		<div class="mb-3 rounded-xl p-3" style="background:#0c0f15;">
			<div class="mb-1 text-xs text-white/40">Live program scene</div>
			<div class="text-sm text-white/85">{obs.currentScene ?? '—'}</div>
		</div>

		<div class="mb-3">
			<div class="mb-2 text-xs text-white/40">Scenes — tap to control source visibility</div>
			<div class="grid grid-cols-2 gap-2">
				{#each obs.scenes as scene}
					<button
						class="ctl-btn truncate"
						style={scene === (obs.selectedScene || obs.currentScene) ? 'background:#1d4ed8;' : ''}
						onclick={() => inspectScene(scene)}
						title={scene}>{scene}</button
					>
				{/each}
			</div>
		</div>

		<div>
			<div class="mb-2 text-xs text-white/40">
				Sources in “{obs.selectedScene || obs.currentScene || '—'}” — tap to toggle
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

		<div class="mt-4 rounded-xl border p-3" style="border-color:var(--chrome-line);">
			<div class="mb-2 text-xs text-white/40">Quick wall setup (side by side)</div>
			<div class="mb-2 text-xs text-white/45">
				Builds camp sources left-to-right using display widths, intended for a 6144x2160 main canvas.
			</div>
			<div class="mb-2 flex items-center gap-2 text-sm">
				<label for="obs-wall-width" class="text-white/50">Canvas</label>
				<input id="obs-wall-width" type="number" bind:value={wallWidth} class="ctl-input w-24" />
				<span class="text-white/40">x</span>
				<input id="obs-wall-height" type="number" bind:value={wallHeight} class="ctl-input w-24" />
				<label for="obs-wall-gap" class="ml-2 text-white/50">Gap</label>
				<input id="obs-wall-gap" type="number" bind:value={wallGap} class="ctl-input w-20" />
				<button class="ctl-btn ml-auto !py-2 text-sm" onclick={quickSetupWall}>Apply Wall Layout</button>
			</div>
			<div class="mb-3 flex gap-2">
				<button class="ctl-btn !py-2 text-sm" onclick={() => setCampSourcesOnly(true)}>
					Camp Sources Only
				</button>
				<button class="ctl-btn !py-2 text-sm" onclick={() => setCampSourcesOnly(false)}>
					Other Sources Only
				</button>
			</div>
			<div class="text-xs text-white/45">
				Preview order: {orderedDisplays().map((d) => `${d.label} (${d.targetWidth}x${d.targetHeight})`).join(' | ')}
			</div>
		</div>

		<div class="mt-4 rounded-xl border p-3" style="border-color:var(--chrome-line);">
			<div class="mb-2 text-xs text-white/40">Auto-configure browser source from display URL</div>
			<div class="mb-3 text-xs text-white/45">
				Creates or updates an OBS Browser Source in the selected scene. You can still add movies or YouTube
				sources manually and toggle them the same way.
			</div>
			<div class="flex flex-col gap-2">
				{#each displays as d (d.id)}
					<div class="rounded-lg p-2" style="background:#0c0f15;">
						<div class="mb-2 flex items-center justify-between gap-2">
							<div class="min-w-0">
								<div class="truncate text-sm text-white/90">{d.label}</div>
								<div class="truncate text-xs text-white/45">{displayUrl(d.id)}</div>
							</div>
							<div class="text-xs text-white/45">{d.targetWidth}x{d.targetHeight}</div>
						</div>
						<div class="flex items-center gap-2">
							<input
								type="text"
								value={sourceNames[d.id] || ''}
								onchange={(e) => setSourceName(d.id, e.currentTarget.value)}
								class="ctl-input flex-1"
								placeholder="OBS Browser Source name"
							/>
							<button class="ctl-btn !py-2 text-sm" onclick={() => autoSetupBrowserSource(d)}>
								Create / Update
							</button>
						</div>
					</div>
				{:else}
					<span class="text-sm text-white/40">No displays configured.</span>
				{/each}
			</div>
		</div>
	{/if}
</section>
