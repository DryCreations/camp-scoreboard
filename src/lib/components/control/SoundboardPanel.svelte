<script>
	import { store, emit, setLocalAudio } from '$lib/socketClient.svelte.js';

	// Buttons come straight from the sounds discovered in data/sounds/. Drop a new
	// .wav/.mp3 in that folder (and optionally name it in sounds.json) and it shows
	// up here after a refresh — no code changes.
	let sounds = $derived(store.state.sounds ?? []);

	// Sounds always play on the displays; this only controls whether THIS device
	// (the phone/tablet) also makes noise. Off by default.
	let localAudio = $derived(store.localAudio);

	function play(file) {
		emit('sound:play', { file });
	}
</script>

<section class="ctl-card">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="ctl-h">Soundboard</h2>
		<button class="ctl-btn !py-1.5 !px-3 text-xs" onclick={() => emit('sounds:refresh')}>Refresh</button>
	</div>

	<label class="mb-3 flex items-center justify-between rounded-xl p-3 text-sm" style="background:#0c0f15;">
		<span>Also play on this device</span>
		<input
			type="checkbox"
			checked={localAudio}
			onchange={(e) => setLocalAudio(e.currentTarget.checked)}
			class="h-6 w-6 accent-blue-600"
		/>
	</label>

	{#if sounds.length === 0}
		<p class="text-xs text-white/50">
			No sounds found. Add .wav/.mp3 files to <code>data/sounds/</code> and tap Refresh.
		</p>
	{:else}
		<div class="grid grid-cols-2 gap-2">
			{#each sounds as s}
				<button class="ctl-btn" style="background:#1d4ed8;" onclick={() => play(s.file)}>
					🔊 {s.name}
				</button>
			{/each}
		</div>
	{/if}
</section>
