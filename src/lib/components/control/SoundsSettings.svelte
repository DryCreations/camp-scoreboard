<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Manage the soundboard library (files in data/sounds/) and choose which sound
	// each momentary trigger plays. Everything here persists to config / the folder.
	let sounds = $derived(store.state.sounds ?? []);
	let triggers = $derived(store.state.triggers ?? []);

	function preview(file) {
		try {
			new Audio('/sounds/' + encodeURIComponent(file)).play().catch(() => {});
		} catch {
			/* ignore */
		}
	}

	function setTriggerSound(id, file) {
		emit('trigger:update', { id, patch: { sound: file || null } });
	}
</script>

<section class="ctl-card">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="ctl-h">Sounds</h2>
		<button class="ctl-btn !py-1.5 !px-3 text-xs" onclick={() => emit('sounds:refresh')}>Rescan folder</button>
	</div>

	<p class="mb-3 text-xs text-white/50">
		Audio files live in <code>data/sounds/</code>. Add <code>.wav</code>/<code>.mp3</code> files there
		and set friendly names in <code>data/sounds/sounds.json</code>, then Rescan.
	</p>

	<!-- Library with preview -->
	<div class="mb-4 space-y-2">
		{#each sounds as s}
			<div class="flex items-center justify-between rounded-xl p-2" style="background:#0c0f15;">
				<div class="min-w-0">
					<div class="truncate font-timer text-sm">{s.name}</div>
					<div class="truncate text-[11px] text-white/40">{s.file}</div>
				</div>
				<button class="ctl-btn !py-1.5 !px-3 text-xs" onclick={() => preview(s.file)}>▶ Play</button>
			</div>
		{/each}
		{#if sounds.length === 0}
			<p class="text-xs text-white/40">No audio files found in data/sounds/.</p>
		{/if}
	</div>

	<!-- Assign a sound to each trigger (buzzer, confetti, shot-clock, …) -->
	<div class="ctl-h mb-2">Trigger sounds</div>
	<div class="space-y-2">
		{#each triggers as t}
			<label class="flex items-center justify-between gap-3 rounded-xl p-2" style="background:#0c0f15;">
				<span class="font-timer text-sm">{t.label}</span>
				<select
					class="ctl-input max-w-[60%] flex-1 text-sm"
					value={t.sound ?? ''}
					onchange={(e) => setTriggerSound(t.id, e.currentTarget.value)}
				>
					<option value="">(no sound)</option>
					{#each sounds as s}
						<option value={s.file}>{s.name}</option>
					{/each}
				</select>
			</label>
		{/each}
	</div>
</section>
