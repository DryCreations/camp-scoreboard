<script>
	import { store, emit } from '$lib/socketClient.svelte.js';
	import { logoSrc } from '$lib/logo.js';

	// Full-screen image over the scoreboard (a logo between games, a halftime
	// graphic). Tap an image to pick it, then Show; tapping another while it's up
	// switches live. The scoreboard keeps running underneath. Upload, background
	// and size are on /settings -> Full-screen image.
	let theme = $derived(store.state.theme ?? {});
	let assets = $derived(
		[...(store.state.assets ?? [])].sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
	);
	let on = $derived(!!theme.fullscreenOn);
	let selected = $derived(theme.fullscreenImage || '');

	function pick(path) {
		emit('theme:update', { fullscreenImage: path });
	}
	function setOn(value) {
		emit('theme:update', { fullscreenOn: value });
	}
</script>

<section class="ctl-card">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="ctl-h">Full-screen image</h2>
		<span
			class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
			style={on ? 'background:#166534;color:#dcfce7;' : 'background:#26303c;color:#8b95a6;'}
		>
			{on ? 'On air' : 'Off'}
		</span>
	</div>

	{#if assets.length}
		<div class="mb-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
			{#each assets as a (a.id)}
				<button
					class="flex aspect-square items-center justify-center overflow-hidden rounded-lg p-1.5"
					style="background:#0c0f15; border:2px solid {selected === a.path ? '#3b82f6' : 'var(--chrome-line)'};"
					title={a.originalName}
					onclick={() => pick(a.path)}
				>
					<img src={logoSrc(a.path)} alt={a.originalName} class="h-full w-full object-contain" />
				</button>
			{/each}
		</div>
	{:else}
		<p class="mb-3 text-xs text-white/50">
			No images yet. Upload one on Settings → Full-screen image.
		</p>
	{/if}

	<div class="grid grid-cols-2 gap-2">
		<button class="ctl-btn" style="background:#166534;" onclick={() => setOn(true)}>Show</button>
		<button class="ctl-btn" onclick={() => setOn(false)}>Hide</button>
	</div>
</section>
