<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	let s = $derived(store.state);
	let bonus = $derived(Number(s.settings?.bonusThreshold) || 0);

	let teams = $derived([
		{ side: 'home', name: s.theme.homeName, color: s.theme.homeColor },
		{ side: 'away', name: s.theme.awayName, color: s.theme.awayColor }
	]);

	function adjust(side, delta) {
		emit('foul:adjust', { side, delta });
	}
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Team Fouls</h2>
	<div class="grid grid-cols-2 gap-3">
		{#each teams as t}
			<div class="flex flex-col items-center gap-2 rounded-xl p-3" style="background:#0c0f15;">
				<div class="font-timer text-sm" style="color:{t.color}; letter-spacing:0.08em;">{t.name}</div>
				<div class="flex items-center gap-2">
					<span class="font-timer tabular-nums text-3xl">{s.fouls[t.side]}</span>
					{#if bonus && s.fouls[t.side] >= bonus}
						<span class="font-label rounded px-2 py-0.5 text-xs" style="background:#f59e0b; color:#0a0c10;"
							>Bonus</span
						>
					{/if}
				</div>
				<div class="grid w-full grid-cols-2 gap-2">
					<button class="ctl-btn" style="font-size:1.4rem;" onclick={() => adjust(t.side, -1)}>−</button>
					<button class="ctl-btn" style="font-size:1.4rem;" onclick={() => adjust(t.side, 1)}>+</button>
				</div>
			</div>
		{/each}
	</div>
</section>
