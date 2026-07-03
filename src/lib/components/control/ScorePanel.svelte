<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	let s = $derived(store.state);

	function adjust(side, delta) {
		emit('score:adjust', { side, delta });
	}

	let teams = $derived([
		{ side: 'home', name: s.theme.homeName, color: s.theme.homeColor },
		{ side: 'away', name: s.theme.awayName, color: s.theme.awayColor }
	]);
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Score</h2>
	<div class="grid grid-cols-2 gap-3">
		{#each teams as t}
			<div class="flex flex-col items-center gap-2 rounded-xl p-3" style="background:#0c0f15;">
				<div class="font-timer text-sm" style="color:{t.color}; letter-spacing:0.08em;">{t.name}</div>
				<div class="font-score tabular-nums" style="font-size:3.4rem; line-height:1; color:{t.color};">
					{s.score[t.side]}
				</div>
				<div class="grid w-full grid-cols-2 gap-2">
					<button class="ctl-btn" style="font-size:1.5rem;" onclick={() => adjust(t.side, -1)}>−</button>
					<button
						class="ctl-btn"
						style="font-size:1.5rem; background:{t.color};"
						onclick={() => adjust(t.side, 1)}>+</button
					>
				</div>
			</div>
		{/each}
	</div>
</section>
