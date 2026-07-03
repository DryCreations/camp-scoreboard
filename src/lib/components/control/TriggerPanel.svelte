<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Momentary fire-and-forget events, generated from trigger config — nothing
	// hardcoded. Each plays an animation/sound for a fixed duration then clears.
	let triggers = $derived(store.state.triggers);
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Triggers</h2>
	<div class="grid grid-cols-2 gap-2">
		{#each triggers as t}
			<button
				class="ctl-btn"
				style="background:#3730a3;"

				onclick={() => emit('trigger:fire', { id: t.id })}>{t.label}</button
			>
		{/each}
	</div>
</section>
