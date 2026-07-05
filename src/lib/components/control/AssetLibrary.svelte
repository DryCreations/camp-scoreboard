<script>
	import { store, emit } from '$lib/socketClient.svelte.js';
	import { logoSrc } from '$lib/logo.js';

	// Persistent image library: upload once (drag-drop or picker), then reuse any
	// asset as a team/center logo or a display background. Files live in
	// data/uploads/; metadata in data/assets.json — both survive restarts.
	let assets = $derived(store.state?.assets ?? []);
	let theme = $derived(store.state?.theme ?? {});
	let uploading = $state(false);
	let dragOver = $state(false);
	let uploadError = $state('');
	let open = $state(false);
	let query = $state('');
	let filter = $state('all');

	let filteredAssets = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const toMillis = (value) => {
			if (typeof value === 'number' && Number.isFinite(value)) return value;
			if (typeof value === 'string') {
				const parsed = Date.parse(value);
				return Number.isNaN(parsed) ? 0 : parsed;
			}
			return 0;
		};
		const list = [...assets]
			.filter((a) => {
				const name = (a.originalName ?? '').toLowerCase();
				if (q && !name.includes(q)) return false;
				const used = usedAs(a.path).length > 0;
				if (filter === 'used') return used;
				if (filter === 'unused') return !used;
				return true;
			})
			.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
		return list;
	});

	async function uploadFiles(fileList) {
		const files = [...(fileList ?? [])].filter((f) => f.type.startsWith('image/'));
		if (!files.length) return;
		uploading = true;
		uploadError = '';
		try {
			for (const file of files) {
				const body = new FormData();
				body.append('file', file);
				const res = await fetch('/api/upload?kind=logo', { method: 'POST', body });
				if (!res.ok) {
					uploadError = res.status === 413 ? 'Image too large.' : `Upload failed (${res.status}).`;
				}
			}
			emit('assets:refresh');
		} catch (err) {
			uploadError = 'Upload failed. Is the server reachable?';
		} finally {
			uploading = false;
		}
	}

	function onDrop(e) {
		e.preventDefault();
		dragOver = false;
		uploadFiles(e.dataTransfer?.files);
	}

	function assignTo(key, path) {
		emit('theme:update', { [key]: path });
	}
	function toggleAssign(key, path) {
		emit('theme:update', { [key]: isAssigned(key, path) ? '' : path });
	}
	function del(id) {
		emit('asset:delete', { id });
	}
	function rename(a) {
		const name = prompt('Rename asset', a.originalName);
		if (name && name.trim()) emit('asset:rename', { id: a.id, name: name.trim() });
	}

	function usedAs(path) {
		const roles = [];
		if (theme.homeLogo === path) roles.push('Home');
		if (theme.awayLogo === path) roles.push('Away');
		if (theme.centerLogo === path) roles.push('Center');
		if (theme.backgroundImage === path) roles.push('BG');
		return roles;
	}

	function fmtSize(b) {
		return b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
	}

	function isAssigned(key, path) {
		return theme?.[key] === path;
	}
</script>

<section class="ctl-card">
	<div class="mb-3 flex items-center justify-between gap-2">
		<div>
			<h2 class="ctl-h">Asset Library</h2>
			<p class="text-xs text-white/45">Upload once, assign anywhere.</p>
		</div>
		<div class="flex flex-wrap justify-end gap-2">
			<button class="ctl-btn !py-1.5 !px-3 text-xs" onclick={() => (open = !open)}>{open ? 'Hide' : 'Open'}</button>
			{#if theme.backgroundImage}
				<button class="ctl-btn !py-1.5 !px-3 text-xs" onclick={() => assignTo('backgroundImage', '')}>Clear BG</button>
			{/if}
			<button class="ctl-btn !py-1.5 !px-3 text-xs" onclick={() => emit('assets:refresh')}>Refresh</button>
		</div>
	</div>

	{#if !open}
		<p class="text-xs text-white/50">Open Library to browse, upload, and assign images.</p>
	{:else}
		<div class="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
			<input class="ctl-input sm:col-span-2" bind:value={query} placeholder="Search image name..." />
			<select class="ctl-input" bind:value={filter}>
				<option value="all">All assets</option>
				<option value="used">In use</option>
				<option value="unused">Unused</option>
			</select>
		</div>

		<!-- Drag-and-drop / click upload zone -->
		<label
			class="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center text-sm transition-colors"
			style="border-color:{dragOver ? '#3b82f6' : 'var(--chrome-line)'}; background:{dragOver ? 'rgba(59,130,246,0.08)' : '#0c0f15'};"
			ondragover={(e) => { e.preventDefault(); dragOver = true; }}
			ondragleave={() => (dragOver = false)}
			ondrop={onDrop}
		>
			<span class="font-medium text-white/80">{uploading ? 'Uploading...' : 'Drop images here or tap to upload'}</span>
			<span class="mt-1 text-xs text-white/40">PNG / JPG / WebP / SVG. Logos: ~512px transparent PNG.</span>
			<input
				type="file"
				accept="image/*"
				multiple
				class="hidden"
				onchange={(e) => uploadFiles(e.currentTarget.files)}
			/>
		</label>
		{#if uploadError}<p class="mb-2 text-xs text-red-400">{uploadError}</p>{/if}

		{#if assets.length === 0}
			<p class="text-xs text-white/40">No images yet. Upload one above to reuse it anytime.</p>
		{:else if filteredAssets.length === 0}
			<p class="text-xs text-white/40">No assets match that filter.</p>
		{:else}
			<div class="mb-2 text-xs text-white/45">{filteredAssets.length} shown of {assets.length}</div>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each filteredAssets as a (a.id)}
					<div class="rounded-xl p-3" style="background:#0c0f15; border:1px solid var(--chrome-line); box-shadow:inset 0 0 0 1px rgba(255,255,255,0.02);">
						<div
							class="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-lg"
							style="background:repeating-conic-gradient(#141821 0% 25%, #0c0f15 0% 50%) 50% / 12px 12px;"
						>
							<img src={logoSrc(a.path)} alt={a.originalName} class="max-h-full max-w-full object-contain" />
						</div>

						<div class="mb-2 flex items-start justify-between gap-2">
							<button class="min-w-0 flex-1 truncate text-left text-sm font-medium text-white/80" title="Rename" onclick={() => rename(a)}>{a.originalName}</button>
							<button class="ctl-btn !py-1 !px-2 text-[11px]" onclick={() => rename(a)}>Rename</button>
						</div>

						<div class="mb-2 text-xs text-white/45">{fmtSize(a.bytes)}</div>

						<div class="mb-2 flex min-h-6 flex-wrap gap-1">
							{#each usedAs(a.path) as r}
								<span class="rounded px-1.5 py-0.5 text-[10px]" style="background:#1d4ed8; color:#dbe6ff;">{r}</span>
							{/each}
						</div>

						<div class="grid grid-cols-2 gap-1">
							<button
								class="ctl-btn !py-1 !px-1.5 !text-[10px] leading-tight"
								style={isAssigned('homeLogo', a.path) ? 'background:#1d4ed8;' : ''}
								onclick={() => toggleAssign('homeLogo', a.path)}>{isAssigned('homeLogo', a.path) ? 'Home On' : 'Home'}</button
							>
							<button
								class="ctl-btn !py-1 !px-1.5 !text-[10px] leading-tight"
								style={isAssigned('awayLogo', a.path) ? 'background:#1d4ed8;' : ''}
								onclick={() => toggleAssign('awayLogo', a.path)}>{isAssigned('awayLogo', a.path) ? 'Away On' : 'Away'}</button
							>
							<button
								class="ctl-btn !py-1 !px-1.5 !text-[10px] leading-tight"
								style={isAssigned('centerLogo', a.path) ? 'background:#1d4ed8;' : ''}
								onclick={() => toggleAssign('centerLogo', a.path)}>{isAssigned('centerLogo', a.path) ? 'Center On' : 'Center'}</button
							>
							<button
								class="ctl-btn !py-1 !px-1.5 !text-[10px] leading-tight"
								style={isAssigned('backgroundImage', a.path) ? 'background:#1d4ed8;' : ''}
								onclick={() => toggleAssign('backgroundImage', a.path)}>{isAssigned('backgroundImage', a.path) ? 'BG On' : 'BG'}</button
							>
							<button class="ctl-btn col-span-2 !py-1 !px-1.5 !text-[10px] leading-tight" style="background:#7f1d1d;" onclick={() => del(a.id)}>Delete</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</section>
