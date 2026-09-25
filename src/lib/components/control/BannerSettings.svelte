<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Look of the top/bottom banners. Text and Show/Hide are on /control ->
	// Banners. Size is text height as a percent of the display's height.
	const banners = [
		{ key: 'Top', label: 'Top banner' },
		{ key: 'Bottom', label: 'Bottom banner' }
	];
	const colorFields = [
		{ suffix: 'Color', label: 'Text color', fallback: '#f4f6fb' },
		{ suffix: 'Bg', label: 'Background', fallback: '#0b0f16' }
	];

	let theme = $derived(store.state.theme ?? {});

	function set(key, value) {
		emit('theme:update', { [key]: value });
	}
	function setSize(key, v) {
		set(key, Math.max(2, Math.min(15, Math.round((Number(v) || 5) * 2) / 2)));
	}
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Banners</h2>

	{#each banners as b, i}
		<div class="rounded-xl p-3 {i === 0 ? 'mb-3' : ''}" style="background:#0c0f15;">
			<div class="mb-2 text-sm text-white/80">{b.label}</div>

			<label class="mb-3 block">
				<div class="mb-1 flex items-center justify-between">
					<span class="ctl-h">Text size</span>
					<span class="font-timer text-sm text-white/70">{theme[`banner${b.key}Size`] ?? 5}</span>
				</div>
				<input
					type="range"
					min="2"
					max="15"
					step="0.5"
					value={theme[`banner${b.key}Size`] ?? 5}
					oninput={(e) => setSize(`banner${b.key}Size`, e.currentTarget.value)}
					class="w-full accent-blue-600"
				/>
			</label>

			<div class="grid grid-cols-2 gap-2">
				{#each colorFields as f}
					{@const key = `banner${b.key}${f.suffix}`}
					<label class="block min-w-0 text-xs text-white/60">
						{f.label}
						<div class="mt-1 flex items-center gap-2">
							<input
								type="color"
								value={theme[key] || f.fallback}
								oninput={(e) => set(key, e.currentTarget.value)}
								class="h-11 w-12 shrink-0 rounded bg-transparent"
							/>
							<input
								type="text"
								value={theme[key] || f.fallback}
								onchange={(e) => set(key, e.currentTarget.value)}
								class="ctl-input w-full min-w-0"
							/>
						</div>
					</label>
				{/each}
			</div>
		</div>
	{/each}
</section>
