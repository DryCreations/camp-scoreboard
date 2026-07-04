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

	let maxScoreDigits = $derived(
		Math.max(
			String(Math.max(0, Number(gameState.score?.home) || 0)).length,
			String(Math.max(0, Number(gameState.score?.away) || 0)).length
		)
	);

	let sharedScoreSize = $derived(maxScoreDigits >= 3 ? '50cqh' : maxScoreDigits === 2 ? '58cqh' : '63cqh');
</script>

<DisplayBase {entry} {theme} {trigger} overlay={gameState.overlay} ticker={gameState.ticker}>
	<div class="led-grid flex h-full w-full flex-row items-center justify-center relative" style="padding:3cqh 1.5cqw 1cqh;">
		<!-- Top stripe with team colors (home on left, away on right) -->
		<div style="position:absolute; top:0; left:0; right:0; height:1.4cqh; display:flex; gap:0; z-index:5;">
			<div style="flex:1; background:{theme.homeColor};"></div>
			<div style="flex:1; background:{theme.awayColor};"></div>
		</div>

		{#each teams as t, i}
			<div
				class="relative flex flex-1 flex-col items-center justify-center"
				style="gap:2.6cqh; min-width:0; margin:1.2cqh 0; padding:3.4cqh 1.6cqw 2.8cqh; background:linear-gradient(180deg, color-mix(in srgb, {t.color} 15%, rgba(7,10,16,0.88)) 0%, rgba(9,13,20,0.84) 100%); border:0.22cqh solid color-mix(in srgb, {t.color} 42%, rgba(255,255,255,0.12)); border-radius:2.6cqh; box-shadow:inset 0 0 0 0.1cqh rgba(255,255,255,0.04), 0 1cqh 2.8cqh rgba(4,8,16,0.24);"
			>
				<div style="position:absolute; top:0; left:0; right:0; height:0.8cqh; background:{t.color}; border-top-left-radius:2.6cqh; border-top-right-radius:2.6cqh;"></div>

				<span
					class="font-timer"
					style="font-size:7.2cqh; line-height:1; color:{t.color}; letter-spacing:0.08em; text-shadow:none; text-align:center;"
					>{t.name}</span
				>

				<div style="height:44cqh; width:100%; display:flex; align-items:center; justify-content:center;">
					<span
						class="font-score tabular-nums"
						style="font-size:{sharedScoreSize}; line-height:1; color:#f8fbff; text-shadow:0 0.18cqh 0 rgba(255,255,255,0.12), 0 0.6cqh 1.4cqh rgba(5,10,18,0.24); width:88%; height:100%; text-align:center; display:flex; align-items:center; justify-content:center;"
					>
						{gameState.score[t.side]}
					</span>
				</div>

				<!-- Fixed-height badge row prevents score/name baseline shifting when bonus toggles. -->
				<div style="height:4.6cqh; display:flex; align-items:center; justify-content:center;">
					<span
						class="font-label"
						style="font-size:2.35cqh; padding:0.38cqh 1.2cqh; color:#2f1900; background:#f6c158; border-radius:9999px; box-shadow:0 0.5cqh 1.3cqh rgba(12,10,2,0.16); opacity:{inBonus(t.side) ? '1' : '0'}; transition:opacity 0.2s ease;">Bonus</span
					>
				</div>
			</div>
			{#if i === 0}
				<div style="height:70%; background:var(--chrome-line);"></div>
			{/if}
		{/each}
	</div>
</DisplayBase>
