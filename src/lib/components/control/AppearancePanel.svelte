<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Curated appearance controls: pick a built-in layout preset, then fine-tune a
	// few core knobs. Presets merge their params into the theme; knobs edit the
	// theme directly. Both persist + rebroadcast to every display live.
	let presets = $derived(store.state.presets ?? []);
	let active = $derived(store.state.activePreset);
	let theme = $derived(store.state.theme);
	let glow = $derived(Number(theme?.glowIntensity ?? 40));
	let dividers = $derived(theme?.showDividers !== false);

	function applyPreset(id) {
		emit('preset:apply', { id });
	}
	function setGlow(v) {
		emit('theme:update', { glowIntensity: Math.max(0, Math.min(100, Math.round(Number(v) || 0))) });
	}
	function setDividers(on) {
		emit('theme:update', { showDividers: !!on });
	}
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Appearance</h2>

	<div class="ctl-h mb-2" style="letter-spacing:0.14em;">Layout preset</div>
	<div class="mb-4 grid grid-cols-3 gap-2">
		{#each presets as p}
			<button
				class="ctl-btn"
				style={active === p.id ? 'background:#1d4ed8;' : ''}
				onclick={() => applyPreset(p.id)}>{p.name}</button
			>
		{/each}
	</div>

	<label class="mb-3 block">
		<div class="mb-1 flex items-center justify-between">
			<span class="ctl-h">Glow intensity</span>
			<span class="font-timer text-sm text-white/70">{glow}</span>
		</div>
		<input
			type="range"
			min="0"
			max="100"
			value={glow}
			oninput={(e) => setGlow(e.currentTarget.value)}
			class="w-full accent-blue-600"
		/>
	</label>

	<label class="flex items-center justify-between rounded-xl p-3 text-sm" style="background:#0c0f15;">
		<span>Structural dividers</span>
		<input
			type="checkbox"
			checked={dividers}
			onchange={(e) => setDividers(e.currentTarget.checked)}
			class="h-6 w-6 accent-blue-600"
		/>
	</label>
</section>
