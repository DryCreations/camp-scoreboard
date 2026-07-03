<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	let s = $derived(store.state);
	let active = $derived(s.overlay?.active);
	let current = $derived(s.overlay?.label);

	const presets = ['Timeout', 'Halftime', 'Technical', 'Final'];
	let custom = $state('');

	function show(label) {
		emit('overlay:show', { label });
	}
	// Clicking the preset that's already showing turns the overlay off — no need
	// to reach for the separate Hide button.
	function togglePreset(label) {
		if (active && current === label) emit('overlay:hide');
		else show(label);
	}
	function showCustom() {
		if (custom.trim()) show(custom.trim());
	}
</script>

<section class="ctl-card">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="ctl-h">Overlay</h2>
		<span
			class="rounded-full px-3 py-1 text-xs font-semibold"
			style={active ? 'background:#166534;color:#dcfce7;' : 'background:#232a36;color:#8b95a6;'}
		>
			{active ? `On — ${current ?? ''}` : 'Off'}
		</span>
	</div>

	<div class="mb-3 grid grid-cols-2 gap-2">
		{#each presets as p}
			<button
				class="ctl-btn"
				style={active && current === p ? 'background:#1d4ed8;' : ''}
				onclick={() => togglePreset(p)}>{p}</button
			>
		{/each}
	</div>

	<div class="mb-3 flex gap-2">
		<input
			class="ctl-input flex-1"
			placeholder="Custom text…"
			bind:value={custom}
			onkeydown={(e) => e.key === 'Enter' && showCustom()}
		/>
		<button class="ctl-btn" onclick={showCustom}>Show</button>
	</div>

	<button class="ctl-btn w-full" style="background:#7f1d1d;" onclick={() => emit('overlay:hide')}>
		Hide Overlay
	</button>
</section>
