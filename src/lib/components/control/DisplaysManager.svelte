<script>
	import { store, emit } from '$lib/socketClient.svelte.js';
	import { displayTypeOptions } from '$lib/displayTypes.js';

	const DISPLAY_DEFAULTS = {
		scoreboard: { width: 3840, height: 2160 },
		clock: { width: 1152, height: 720 },
		score: { width: 1152, height: 720 }
	};

	function defaultResolutionForType(nextType) {
		return DISPLAY_DEFAULTS[nextType] ?? { width: 1152, height: 720 };
	}

	let displays = $derived(store.state.displays);

	// New-display form state.
	let label = $state('New Display');
	let type = $state('scoreboard');
	let width = $state(3840);
	let height = $state(2160);

	function add() {
		emit('display:add', { label, type, targetWidth: Number(width), targetHeight: Number(height) });
	}

	function setAddType(nextType) {
		type = nextType;
		const defaults = defaultResolutionForType(nextType);
		width = defaults.width;
		height = defaults.height;
	}
	function update(id, patch) {
		emit('display:update', { id, patch });
	}
	function displayUrl(id) {
		return `${location.origin}/display/${id}`;
	}
	function copyUrl(id) {
		navigator.clipboard?.writeText(displayUrl(id));
	}

	// Popout opens the display in a new window sized to its EXACT target
	// resolution — for non-OBS capture paths (e.g. window/display capture feeding
	// Novastar). For OBS the cleaner route is adding displayUrl(id) as a Browser
	// Source and setting that source's width/height to the target resolution in
	// OBS itself: OBS renders it off-screen via CEF at that resolution regardless
	// of the machine's actual monitor size.
	function popout(d) {
		window.open(displayUrl(d.id), `display_${d.id}`, `width=${d.targetWidth},height=${d.targetHeight}`);
	}
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Displays</h2>

	<div class="space-y-3">
		{#each displays as d (d.id)}
			<div class="rounded-xl p-3" style="background:#0c0f15;">
				<div class="mb-2 flex items-center gap-2">
					<input
						type="text"
						value={d.label}
						onchange={(e) => update(d.id, { label: e.currentTarget.value })}
						class="ctl-input flex-1 font-semibold"
					/>
					<select
						value={d.type}
						onchange={(e) => update(d.id, { type: e.currentTarget.value })}
						class="ctl-input"
					>
						{#each displayTypeOptions as opt}
							<option value={opt}>{opt}</option>
						{/each}
					</select>
				</div>

				<div class="mb-2 flex items-center gap-2 text-sm">
					<input
						type="number"
						value={d.targetWidth}
						onchange={(e) => update(d.id, { targetWidth: e.currentTarget.value })}
						class="ctl-input w-24"
					/>
					<span class="text-white/40">×</span>
					<input
						type="number"
						value={d.targetHeight}
						onchange={(e) => update(d.id, { targetHeight: e.currentTarget.value })}
						class="ctl-input w-24"
					/>
					<code class="ml-auto truncate text-xs text-white/40">/display/{d.id}</code>
				</div>

				<div class="flex gap-2">
					<button class="ctl-btn flex-1 !py-2 text-sm" onclick={() => copyUrl(d.id)}>Copy URL</button>
					<button class="ctl-btn flex-1 !py-2 text-sm" onclick={() => popout(d)}>Pop out</button>
					<button
						class="ctl-btn !py-2 text-sm"
						style="background:#7f1d1d;"
						onclick={() => emit('display:remove', { id: d.id })}>Remove</button
					>
				</div>
			</div>
		{/each}
	</div>

	<div class="mt-4 rounded-xl border p-3" style="border-color:var(--chrome-line);">
		<div class="ctl-h mb-2">Add display</div>
		<div class="mb-2 flex gap-2">
			<input type="text" bind:value={label} class="ctl-input flex-1" />
			<select value={type} onchange={(e) => setAddType(e.currentTarget.value)} class="ctl-input">
				{#each displayTypeOptions as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</div>
		<div class="flex items-center gap-2">
			<input type="number" bind:value={width} class="ctl-input w-24" />
			<span class="text-white/40">×</span>
			<input type="number" bind:value={height} class="ctl-input w-24" />
			<button class="ctl-btn ml-auto" style="background:#3730a3;" onclick={add}>Add</button>
		</div>
	</div>
</section>
