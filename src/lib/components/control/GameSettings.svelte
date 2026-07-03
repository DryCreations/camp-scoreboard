<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Persisted game rules. Kept on the settings view (not the live control view)
	// since these are set-once-per-event, not per-play.
	let s = $derived(store.state);
	let duration = $derived(s.settings?.shotClockDuration ?? 24);
	let bonus = $derived(Number(s.settings?.bonusThreshold) || 0);

	function setDuration(v) {
		emit('settings:update', { shotClockDuration: Math.max(1, Math.floor(Number(v) || 0)) });
	}
	function setBonus(v) {
		emit('settings:update', { bonusThreshold: Math.max(0, Math.floor(Number(v) || 0)) });
	}
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Game Rules</h2>
	<div class="grid grid-cols-1 gap-3">
		<label class="flex items-center justify-between rounded-xl p-3 text-xs text-white/50" style="background:#0c0f15;">
			<span class="ctl-h">Shot clock (s)</span>
			<input
				type="number"
				min="1"
				value={duration}
				onchange={(e) => setDuration(e.currentTarget.value)}
				class="ctl-input w-20 text-center text-lg"
			/>
		</label>
		<label class="flex items-center justify-between rounded-xl p-3 text-xs text-white/50" style="background:#0c0f15;">
			<span class="ctl-h">Foul bonus at</span>
			<input
				type="number"
				min="0"
				value={bonus}
				onchange={(e) => setBonus(e.currentTarget.value)}
				class="ctl-input w-20 text-center text-lg"
			/>
		</label>
	</div>
</section>
