<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Look of the full-screen image: upload, size, and the background behind it.
	// Show/Hide and picking which image are on /control -> Full-screen image.
	// Blank colors fall back to the scoreboard's, so "Match scoreboard" just
	// clears them.
	let theme = $derived(store.state.theme ?? {});
	let scale = $derived(Number(theme.fullscreenScale) || 100);
	let mode = $derived(
		['radial', 'linear', 'solid'].includes(theme.fullscreenBgMode)
			? theme.fullscreenBgMode
			: theme.gradientMode === 'linear'
				? 'linear'
				: 'radial'
	);
	let colors = $derived(
		[
			{ key: 'fullscreenBgStart', label: mode === 'solid' ? 'Color' : 'Start', fallback: theme.gradientStart || '#4f7fcc' },
			{ key: 'fullscreenBgMid', label: 'Middle', fallback: theme.gradientMid || '' },
			{ key: 'fullscreenBgEnd', label: 'End', fallback: theme.gradientEnd || '#213f74' }
		].filter((c, i) => mode !== 'solid' || i === 0)
	);

	let uploading = $state(false);
	let uploadError = $state('');

	function set(key, value) {
		emit('theme:update', { [key]: value });
	}

	async function upload(fileList) {
		const file = fileList?.[0];
		if (!file) return;
		uploading = true;
		uploadError = '';
		try {
			const body = new FormData();
			body.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body });
			if (res.ok) {
				const { path } = await res.json();
				emit('assets:refresh');
				set('fullscreenImage', path);
			} else {
				uploadError = res.status === 413 ? 'Image too large for the server limit.' : `Upload failed (${res.status}).`;
			}
		} catch {
			uploadError = 'Upload failed - is the server reachable?';
		} finally {
			uploading = false;
		}
	}

	function matchScoreboard() {
		emit('theme:update', {
			fullscreenBgMode: '',
			fullscreenBgStart: '',
			fullscreenBgMid: '',
			fullscreenBgEnd: ''
		});
	}
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Full-screen image</h2>

	<label class="ctl-btn mb-1 block w-full cursor-pointer text-center">
		{uploading ? 'Uploading…' : 'Upload image'}
		<input type="file" accept="image/*" class="hidden" onchange={(e) => upload(e.currentTarget.files)} />
	</label>
	<p class="mb-3 text-xs text-white/50">
		Uploads go to the image library and are picked on Control. Transparent PNGs show the
		background behind them.
	</p>
	{#if uploadError}<p class="mb-3 text-xs text-red-400">{uploadError}</p>{/if}

	<label class="mb-4 block">
		<div class="mb-1 flex items-center justify-between">
			<span class="ctl-h">Image size</span>
			<span class="font-timer text-sm text-white/70">{scale}%</span>
		</div>
		<input
			type="range"
			min="30"
			max="100"
			step="5"
			value={scale}
			oninput={(e) => set('fullscreenScale', Number(e.currentTarget.value))}
			class="w-full accent-blue-600"
		/>
	</label>

	<div class="mb-2 flex items-center justify-between">
		<span class="ctl-h">Background</span>
		<button class="ctl-btn !px-3 !py-1.5 text-xs" onclick={matchScoreboard}>Match scoreboard</button>
	</div>
	<div class="mb-3 grid grid-cols-3 gap-2">
		{#each [['radial', 'Radial'], ['linear', 'Linear'], ['solid', 'Solid']] as [value, label]}
			<button
				class="ctl-btn"
				style={mode === value ? 'background:#1d4ed8;' : ''}
				onclick={() => set('fullscreenBgMode', value)}>{label}</button
			>
		{/each}
	</div>
	<div class="grid grid-cols-2 gap-2">
		{#each colors as c (c.key)}
			<label class="block min-w-0 text-xs text-white/60">
				{c.label}
				<div class="mt-1 flex items-center gap-2">
					<input
						type="color"
						value={theme[c.key] || c.fallback || '#000000'}
						oninput={(e) => set(c.key, e.currentTarget.value)}
						class="h-11 w-12 shrink-0 rounded bg-transparent"
					/>
					<input
						type="text"
						value={theme[c.key] || c.fallback}
						placeholder="none"
						onchange={(e) => set(c.key, e.currentTarget.value.trim())}
						class="ctl-input w-full min-w-0"
					/>
				</div>
			</label>
		{/each}
	</div>
</section>
