<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Direct, live OBS remote — separate from automated triggers. Scenes and
	// sources are discovered from OBS itself (never hand-typed). OBS runs on the
	// same machine as the server (127.0.0.1). If OBS is unreachable we show a
	// clear disconnected state instead of erroring.
	let obs = $derived(store.obs);
	let displays = $derived(store.state?.displays ?? []);
	let wallWidth = $state(6144);
	let wallHeight = $state(2160);
	let wallGap = $state(0);

	function slugToken(value) {
		return String(value ?? '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
	}

	function managedSubSceneName(displayId) {
		const token = slugToken(displayId) || 'display';
		return `camp-view-${token}`;
	}

	function managedBrowserSourceName(displayId) {
		const token = slugToken(displayId) || 'display';
		return `camp-browser-${token}`;
	}

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

	function displayUrl(id) {
		return `${location.origin}/display/${id}`;
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
		const campNames = new Set(orderedDisplays().map((d) => managedSubSceneName(d.id)));
		const updates = (obs.sources || []).map((src) => ({
			source: src.name,
			enabled: enabled ? campNames.has(src.name) : !campNames.has(src.name)
		}));
		emit('obs:setSourcesVisibility', { scene, updates });
	}

	function openDisplaySceneControls(displayId) {
		inspectScene(managedSubSceneName(displayId));
	}

	function upsertDisplayBrowserInManagedScene(display) {
		emit('obs:upsertBrowserSource', {
			scene: managedSubSceneName(display.id),
			source: managedBrowserSourceName(display.id),
			url: displayUrl(display.id),
			width: display.targetWidth,
			height: display.targetHeight
		});
	}
</script>

<section class="ctl-card">
	<div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<h2 class="ctl-h">OBS Control</h2>
		<div class="flex flex-wrap items-center gap-2">
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
				Use Main Scene to control which subviews are visible. Use each managed screen scene to add extra sources
				for that screen.
			</div>
		</div>

		<div class="mb-3 rounded-xl p-3" style="background:#0c0f15;">
			<div class="mb-1 text-xs text-white/40">Live program scene</div>
			<div class="text-sm text-white/85">{obs.currentScene ?? '—'}</div>
		</div>

		<div class="mb-3">
			<div class="mb-2 text-xs text-white/40">Scenes — tap to control source visibility</div>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#each obs.scenes as scene}
					<button
						class="ctl-btn w-full truncate"
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
						class="ctl-btn flex w-full items-center justify-between"
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
				Creates/updates one managed scene per display, then places those scenes side-by-side in Main Scene.
			</div>
			<div class="mb-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
				<div class="flex items-center gap-2">
					<label for="obs-wall-width" class="text-white/50">W</label>
					<input id="obs-wall-width" type="number" bind:value={wallWidth} class="ctl-input w-full" />
				</div>
				<div class="flex items-center gap-2">
					<label for="obs-wall-height" class="text-white/50">H</label>
					<input id="obs-wall-height" type="number" bind:value={wallHeight} class="ctl-input w-full" />
				</div>
				<div class="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
					<label for="obs-wall-gap" class="text-white/50">Gap</label>
					<input id="obs-wall-gap" type="number" bind:value={wallGap} class="ctl-input w-full" />
				</div>
				<button class="ctl-btn w-full !py-2 text-sm sm:col-span-2 lg:col-span-2" onclick={quickSetupWall}>
					Apply Managed Wall
				</button>
			</div>
			<div class="mb-3 flex flex-col gap-2 sm:flex-row">
				<button class="ctl-btn w-full !py-2 text-sm" onclick={() => setCampSourcesOnly(true)}>
					Camp Sources Only
				</button>
				<button class="ctl-btn w-full !py-2 text-sm" onclick={() => setCampSourcesOnly(false)}>
					Other Sources Only
				</button>
			</div>
			<div class="break-words text-xs text-white/45">
				Preview order: {orderedDisplays().map((d) => `${d.label} (${d.targetWidth}x${d.targetHeight})`).join(' | ')}
			</div>
		</div>

		<div class="mt-4 rounded-xl border p-3" style="border-color:var(--chrome-line);">
			<div class="mb-2 text-xs text-white/40">Managed screen scenes (auto-created, no duplicates)</div>
			<div class="mb-3 text-xs text-white/45">
				Each display has a stable scene name + stable browser source name. Add other sources in those scenes,
				then control visibility from this app.
			</div>
			<div class="flex flex-col gap-2">
				{#each displays as d (d.id)}
					<div class="rounded-lg p-2" style="background:#0c0f15; border:1px solid var(--chrome-line);">
						<div class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
							<div class="min-w-0">
								<div class="truncate text-sm text-white/90">{d.label}</div>
								<div class="truncate text-xs text-white/45">{displayUrl(d.id)}</div>
								<div class="mt-1 text-xs text-white/40">
									Scene: {managedSubSceneName(d.id)}
								</div>
								<div class="text-xs text-white/40">
									Browser: {managedBrowserSourceName(d.id)}
								</div>
							</div>
							<div class="text-xs text-white/45">{d.targetWidth}x{d.targetHeight}</div>
						</div>
						<div class="flex flex-col gap-2 sm:flex-row">
							<button class="ctl-btn w-full !py-2 text-sm" onclick={() => upsertDisplayBrowserInManagedScene(d)}>
								Update Browser URL
							</button>
							<button class="ctl-btn w-full !py-2 text-sm" onclick={() => openDisplaySceneControls(d.id)}>
								Open Scene Controls
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
