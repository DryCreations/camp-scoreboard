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
	const sharedScoreSize = '43cqh';
</script>

<DisplayBase {entry} {theme} {trigger} overlay={gameState.overlay} ticker={gameState.ticker} overlayPlacement="center">
	<div class="led-grid flex h-full w-full flex-row items-center justify-center relative" style="padding:1.6cqh 1.4cqw 1cqh; gap:0.8cqw;">
		<!-- Full-width top stripe: same split home/away bar used by other views -->
		<div style="position:absolute; top:0; left:0; right:0; height:1cqh; display:flex; gap:0; z-index:5;">
			<div style="flex:1; background:{theme.homeColor};"></div>
			<div style="flex:1; background:{theme.awayColor};"></div>
		</div>

		{#each teams as t, i}
			<div
				class="relative flex-1"
				style="min-width:0; margin:0.4cqh 0; padding:2.1cqh 1.6cqw 2.4cqh; background:linear-gradient(180deg, color-mix(in srgb, {t.color} 15%, rgba(7,10,16,0.88)) 0%, rgba(9,13,20,0.84) 100%); border:0.22cqh solid color-mix(in srgb, {t.color} 42%, rgba(255,255,255,0.12)); border-radius:2.6cqh; box-shadow:inset 0 0 0 0.1cqh rgba(255,255,255,0.04), 0 1cqh 2.8cqh rgba(4,8,16,0.24); display:grid; grid-template-rows:8cqh 1fr 4.8cqh; align-items:center; overflow:hidden;"
			>
				<!-- Accent bar sits inside the card's 0.22cqh border, so it uses the
				     border's INNER radius (2.6 − 0.22) to follow the rounded corner
				     exactly instead of bulging past it. -->
				<div style="position:absolute; top:0; left:0.22cqh; right:0.22cqh; height:0.95cqh; background:{t.color}; border-top-left-radius:2.38cqh; border-top-right-radius:2.38cqh;"></div>

				<span
					class="font-timer"
					style="font-size:6.6cqh; line-height:1; color:{t.color}; letter-spacing:0.08em; text-shadow:none; text-align:center; display:flex; align-items:center; justify-content:center;"
					>{t.name}</span
				>

				<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:0.2cqh 0;">
					<span
						class="font-score tabular-nums"
						style="font-size:{sharedScoreSize}; line-height:1; color:#f8fbff; text-shadow:0 0.18cqh 0 rgba(255,255,255,0.12), 0 0.5cqh 1.2cqh rgba(5,10,18,0.28), 0 0 calc(2.4cqh * var(--sb-glow)) {t.color}88; width:88%; max-width:100%; min-width:3ch; text-align:center; display:flex; align-items:center; justify-content:center;"
					>
						{gameState.score[t.side]}
					</span>
				</div>

				<!-- Fixed-height badge row prevents score/name baseline shifting when bonus toggles. -->
				<div style="height:100%; display:flex; align-items:center; justify-content:center;">
					<span
						class="bonus-chip"
						style="font-size:2.35cqh; padding:0.42cqh 1.4cqh; letter-spacing:0.1em; opacity:{inBonus(t.side) ? '1' : '0'}; transition:opacity 0.2s ease;">Bonus</span
					>
				</div>
			</div>
			{#if i === 0}<div style="width:0.8cqw; flex:0 0 0.8cqw;"></div>{/if}
		{/each}
	</div>
</DisplayBase>
