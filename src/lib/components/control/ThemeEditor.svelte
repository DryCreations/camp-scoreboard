<script>
	import { store, emit } from '$lib/socketClient.svelte.js';
	import { logoSrc } from '$lib/logo.js';

	// Controlled by server state (value from store, change emits an update). The
	// server persists to config.json and rebroadcasts, so displays reflect edits
	// live with no reload.
	let theme = $derived(store.state.theme);

	function set(key, value) {
		emit('theme:update', { [key]: value });
	}

	// Upload a logo from the device (phone camera roll / file picker), then store
	// the returned server path in the theme.
	let uploading = $state({ homeLogo: false, awayLogo: false, centerLogo: false });
	async function upload(key, fileList) {
		const file = fileList?.[0];
		if (!file) return;
		uploading[key] = true;
		try {
			const body = new FormData();
			body.append('file', file);
			const res = await fetch('/api/upload', { method: 'POST', body });
			if (res.ok) {
				const { path } = await res.json();
				set(key, path);
			}
		} finally {
			uploading[key] = false;
		}
	}

	const colors = [
		['homeColor', 'Home color'],
		['awayColor', 'Away color'],
		['gradientStart', 'Gradient start'],
		['gradientMid', 'Gradient middle'],
		['gradientEnd', 'Gradient end']
	];
	const logos = [
		['homeLogo', 'Home logo'],
		['awayLogo', 'Away logo'],
		['centerLogo', 'Center/Tournament logo']
	];
	const texts = [
		['homeName', 'Home name'],
		['awayName', 'Away name']
	];
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Branding</h2>

	<div class="mb-4 grid grid-cols-2 gap-3">
		{#each colors as [key, label]}
			<label class="text-xs text-white/50">
				{label}
				<div class="mt-1 flex items-center gap-2">
					<input
						type="color"
						value={theme[key] || (key === 'homeColor' ? '#2563eb' : key === 'awayColor' ? '#dc2626' : '#253851')}
						oninput={(e) => set(key, e.currentTarget.value)}
						class="h-11 w-14 rounded bg-transparent"
					/>
					<input
						type="text"
						value={theme[key]}
						onchange={(e) => set(key, e.currentTarget.value)}
						class="ctl-input w-full font-mono text-sm"
					/>
				</div>
			</label>
		{/each}
	</div>

	<div class="mb-4 grid grid-cols-1 gap-3 rounded-xl p-3" style="background:#0c0f15;">
		<label class="text-xs text-white/50">
			Gradient mode
			<select
				class="ctl-input mt-1 w-full"
				value={theme.gradientMode || 'radial'}
				onchange={(e) => set('gradientMode', e.currentTarget.value)}
			>
				<option value="radial">Radial</option>
				<option value="linear">Linear</option>
			</select>
		</label>

		<label class="text-xs text-white/50">
			Radial center (for example: 50% 38%)
			<input
				type="text"
				value={theme.gradientCenter || '50% 38%'}
				onchange={(e) => set('gradientCenter', e.currentTarget.value)}
				class="ctl-input mt-1 w-full"
			/>
		</label>

		<label class="text-xs text-white/50">
			Radial size (for example: 125% 110%)
			<input
				type="text"
				value={theme.gradientSize || '125% 110%'}
				onchange={(e) => set('gradientSize', e.currentTarget.value)}
				class="ctl-input mt-1 w-full"
			/>
		</label>
	</div>

	<div class="mb-4 grid grid-cols-1 gap-4">
		{#each logos as [key, label]}
			<div class="rounded-xl p-3" style="background:#0c0f15;">
				<div class="ctl-h mb-2">{label}</div>
				<div class="flex items-center gap-3">
					<div
						class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border"
						style="border-color:var(--chrome-line); background:#05070b;"
					>
						{#if theme[key]}
							<img src={logoSrc(theme[key])} alt="" class="h-full w-full object-contain" />
						{:else}
							<span class="text-[10px] text-white/30">none</span>
						{/if}
					</div>
					<div class="flex-1">
						<label class="ctl-btn block cursor-pointer text-center text-sm">
							{uploading[key] ? 'Uploading…' : 'Upload image'}
							<input
								type="file"
								accept="image/*"
								class="hidden"
								onchange={(e) => upload(key, e.currentTarget.files)}
							/>
						</label>
						<input
							type="text"
							value={theme[key] ?? ''}
							placeholder="…or local path / URL on the server machine"
							onchange={(e) => set(key, e.currentTarget.value)}
							class="ctl-input mt-2 w-full text-xs"
						/>
					</div>
					{#if theme[key]}
						<button class="ctl-btn !px-3 text-sm" onclick={() => set(key, '')}>Clear</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-3">
		{#each texts as [key, label]}
			<label class="text-xs text-white/50">
				{label}
				<input
					type="text"
					value={theme[key] ?? ''}
					onchange={(e) => set(key, e.currentTarget.value)}
					class="ctl-input mt-1 w-full"
				/>
			</label>
		{/each}
	</div>
</section>
