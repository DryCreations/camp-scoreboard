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
	const sharedScoreSize = 'calc(43 * var(--u))';
</script>

<DisplayBase {entry} {theme} {trigger} overlay={gameState.overlay} ticker={gameState.ticker} overlayPlacement="center">
	<!-- --u: layout unit. Tracks height, but never grows beyond what a 16:10 screen
	     would allow, so narrower screens (4:3) shrink instead of overlapping. -->
	<div class="led-grid flex h-full w-full flex-row items-center justify-center relative" style="--u:min(1cqh, 0.625cqw); padding:calc(1.6 * var(--u)) 1.4cqw calc(1 * var(--u)); gap:0.8cqw;">
		<!-- Full-width top stripe: same split home/away bar used by other views -->
		<div style="position:absolute; top:0; left:0; right:0; height:calc(1 * var(--u)); display:flex; gap:0; z-index:5;">
			<div style="flex:1; background:{theme.homeColor};"></div>
			<div style="flex:1; background:{theme.awayColor};"></div>
		</div>

		{#each teams as t, i}
			<div
				class="relative flex-1"
				style="min-width:0; margin:calc(0.4 * var(--u)) 0; padding:calc(2.1 * var(--u)) 1.6cqw calc(2.4 * var(--u)); background:linear-gradient(180deg, color-mix(in srgb, {t.color} 15%, rgba(7,10,16,0.88)) 0%, rgba(9,13,20,0.84) 100%); border:calc(0.22 * var(--u)) solid color-mix(in srgb, {t.color} 42%, rgba(255,255,255,0.12)); border-radius:calc(2.6 * var(--u)); box-shadow:inset 0 0 0 calc(0.1 * var(--u)) rgba(255,255,255,0.04), 0 calc(1 * var(--u)) calc(2.8 * var(--u)) rgba(4,8,16,0.24); display:grid; grid-template-rows:calc(8 * var(--u)) 1fr calc(4.8 * var(--u)); align-items:center; overflow:hidden;"
			>
				<!-- Accent bar sits inside the card's calc(0.22 * var(--u)) border, so it uses the
				     border's INNER radius (2.6 − 0.22) to follow the rounded corner
				     exactly instead of bulging past it. -->
				<div style="position:absolute; top:0; left:calc(0.22 * var(--u)); right:calc(0.22 * var(--u)); height:calc(0.95 * var(--u)); background:{t.color}; border-top-left-radius:calc(2.38 * var(--u)); border-top-right-radius:calc(2.38 * var(--u));"></div>

				<span
					class="font-timer"
					style="font-size:calc(6.6 * var(--u)); line-height:1; color:{t.color}; letter-spacing:0.08em; text-shadow:none; text-align:center; display:flex; align-items:center; justify-content:center;"
					>{t.name}</span
				>

				<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:calc(0.2 * var(--u)) 0;">
					<span
						class="font-score tabular-nums"
						style="font-size:{sharedScoreSize}; line-height:1; color:#f8fbff; text-shadow:0 calc(0.18 * var(--u)) 0 rgba(255,255,255,0.12), 0 calc(0.5 * var(--u)) calc(1.2 * var(--u)) rgba(5,10,18,0.28), 0 0 calc(calc(2.4 * var(--u)) * var(--sb-glow)) {t.color}88; width:88%; max-width:100%; min-width:3ch; text-align:center; display:flex; align-items:center; justify-content:center;"
					>
						{gameState.score[t.side]}
					</span>
				</div>

				<!-- Fixed-height badge row prevents score/name baseline shifting when bonus toggles. -->
				<div style="height:100%; display:flex; align-items:center; justify-content:center;">
					<span
						class="bonus-chip"
						style="font-size:calc(2.35 * var(--u)); padding:calc(0.42 * var(--u)) calc(1.4 * var(--u)); letter-spacing:0.1em; opacity:{inBonus(t.side) ? '1' : '0'}; transition:opacity 0.2s ease;">Bonus</span
					>
				</div>
			</div>
			{#if i === 0}<div style="width:0.8cqw; flex:0 0 0.8cqw;"></div>{/if}
		{/each}
	</div>
</DisplayBase>
