<script>
	import DisplayBase from './displayBase.svelte';

	// Secondary screen: team names and the two hero score numbers.
	let { entry, state: gameState, trigger } = $props();
	let theme = $derived(gameState.theme);
	let bonus = $derived(Number(gameState.settings?.bonusThreshold) || 0);

	function inBonus(side) {
		if (!bonus) return false;
		const opponent = side === 'home' ? 'away' : 'home';
		return (gameState.fouls?.[opponent] ?? 0) >= bonus;
	}

	let teams = $derived([
		{ side: 'home', color: theme.homeColor, name: theme.homeName },
		{ side: 'away', color: theme.awayColor, name: theme.awayName }
	]);
</script>

<DisplayBase {entry} {theme} {trigger} overlay={gameState.overlay} ticker={gameState.ticker}>
	<div class="led-grid flex h-full w-full flex-row items-center justify-center relative" style="padding:3cqh 1.5cqw 1cqh;">
		<!-- Top stripe with team colors (home on left, away on right) -->
		<div style="position:absolute; top:0; left:0; right:0; height:1.4cqh; display:flex; gap:0; z-index:5;">
			<div style="flex:1; background:{theme.homeColor};"></div>
			<div style="flex:1; background:{theme.awayColor};"></div>
		</div>

		{#each teams as t, i}
			<div class="relative flex flex-1 flex-col items-center justify-center" style="gap:3.5cqh;">

				<span
					class="font-timer"
					style="font-size:9cqh; line-height:1; color:{t.color}; text-shadow:0 0 2.2cqh #fff7e899, 0 0 4.8cqh #fff7e840;"
					>{t.name}</span
				>

				<span
					class="font-score tabular-nums"
					style="font-size:66cqh; line-height:0.8; color:{t.color}; text-shadow:0 0 3.4cqh #fff7e857, 0 0 7.8cqh #fff7e82b, 0 0 12.5cqh #fff7e814; margin:4cqh 0;"
				>
					{gameState.score[t.side]}
				</span>

				<!-- Fixed-height badge row prevents score/name baseline shifting when bonus toggles. -->
				<div style="height:5.2cqh; display:flex; align-items:center; justify-content:center;">
					<span
						class="font-label"
						style="font-size:3cqh; padding:0.4cqh 1.4cqh; color:#0a0c10; background:#f59e0b; opacity:{inBonus(t.side) ? '1' : '0'}; transition:opacity 0.2s ease;">Bonus</span
					>
				</div>
			</div>
			{#if i === 0}
				<div style="height:70%; background:var(--chrome-line);"></div>
			{/if}
		{/each}
	</div>
</DisplayBase>
