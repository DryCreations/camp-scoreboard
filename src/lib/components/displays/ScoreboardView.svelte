<script>
	import DisplayBase from './displayBase.svelte';
	import Countdown from './Countdown.svelte';
	import { logoSrc } from '$lib/logo.js';
	import { msToSeconds, remainingMsFrom } from '$lib/time.js';
	import { serverNow } from '$lib/socketClient.svelte.js';

	// Broadcast-style main scoreboard. The GAME CLOCK is the focal point (large,
	// centered, amber-accented); the score is the team hero number. Team colors
	// drive accents; glows scale with the --sb-glow appearance knob. All sizing
	// uses container-query units so it scales to any targetWidth/targetHeight.
	let { entry, state: gameState, trigger } = $props();

	let theme = $derived(gameState.theme);
	let currentTime = $state.raw(serverNow());

	$effect(() => {
		const i = setInterval(() => (currentTime = serverNow()), 100);
		return () => clearInterval(i);
	});

	let shotClockSeconds = $derived(msToSeconds(remainingMsFrom(gameState.shotClock, currentTime)));
	let bonus = $derived(Number(gameState.settings?.bonusThreshold) || 0);
	let logosEnabled = $derived(theme.logoVisibility?.[entry?.id] !== false);
	let showDividers = $derived(theme.showDividers !== false);

	let hasTeamLogos = $derived(logosEnabled && teams[0]?.logo && teams[1]?.logo);
	let reserveTeamLogoSlot = $derived(logosEnabled && (teams[0]?.logo || teams[1]?.logo));
	let sideColumnGap = $derived(reserveTeamLogoSlot ? '1.1cqh' : '0.85cqh');
	let largeScoreMode = $derived(!reserveTeamLogoSlot);
	let centerLogo = $derived(theme.centerLogo);
	let showCenterLogo = $derived(logosEnabled && centerLogo);
	let centerColumnTopPad = $derived(
		showCenterLogo ? '3.2cqh' : reserveTeamLogoSlot ? '10.4cqh' : '6.2cqh'
	);
	let sideLogoTopOffset = $derived(showCenterLogo ? '3.2cqh' : '1.4cqh');

	let teams = $derived([
		{
			side: 'home',
			color: theme.homeColor,
			name: theme.homeName,
			logo: theme.homeLogo,
			score: gameState.score.home,
			fouls: gameState.fouls.home
		},
		{
			side: 'away',
			color: theme.awayColor,
			name: theme.awayName,
			logo: theme.awayLogo,
			score: gameState.score.away,
			fouls: gameState.fouls.away
		}
	]);

	function inBonus(side) {
		if (!bonus) return false;
		const opponent = side === 'home' ? 'away' : 'home';
		return (gameState.fouls?.[opponent] ?? 0) >= bonus;
	}
</script>

<DisplayBase {entry} {theme} {trigger} overlay={gameState.overlay} ticker={gameState.ticker} overlayPlacement="lower">
	<div class="led-grid flex h-full w-full flex-col items-center justify-center relative">
		<!-- Top stripe with team colors + a thin structural rule beneath it -->
		<div style="position:absolute; top:0; left:0; right:0; height:1cqh; display:flex; gap:0; z-index:5;">
			<div style="flex:1; background:{theme.homeColor};"></div>
			<div style="flex:1; background:{theme.awayColor};"></div>
		</div>
		<div style="position:absolute; top:1cqh; left:0; right:0; height:0.12cqh; background:var(--chrome-line); opacity:0.65; z-index:4;"></div>

		<div class="flex-1 flex w-full flex-col items-center justify-center" style="padding:1cqh 1.5cqw 13cqh;">
			<!-- 3-column layout: Home | Center (clock focal) | Away, with dividers -->
			<div class="flex w-full items-stretch justify-center" style="gap:1.4cqw; flex:1;">

				{#each [teams[0]] as t (t.side)}
					<!-- LEFT COLUMN: HOME TEAM -->
					<div class="flex flex-col items-center justify-center" style="flex:0 0 34%; max-width:34%; gap:{sideColumnGap};">
						{#if reserveTeamLogoSlot}
							<div class="flex items-center justify-center" style="height:25.5cqh; width:25.5cqh; margin-top:{sideLogoTopOffset};">
								{#if t?.logo}
									<img src={logoSrc(t.logo)} alt="" class="object-contain" style="height:100%; width:100%; filter:drop-shadow(0 0 calc(1.6cqh * var(--sb-glow)) rgba(8,12,24,0.6));" />
								{/if}
							</div>
						{/if}

						<div style="font-size:6cqh; line-height:1; color:#f4f6fb; font-family:'Oswald'; font-weight:700;">{t?.name}</div>

						<div style="height:{largeScoreMode ? '34cqh' : '28cqh'}; width:100%; display:flex; align-items:center; justify-content:center; margin:0.9cqh 0 0.7cqh;">
							<div class="font-score tabular-nums" style="font-size:{largeScoreMode ? '34cqh' : '27cqh'}; line-height:1; color:#f7faff; text-shadow:0 0.3cqh 0.4cqh rgba(5,10,18,0.5), 0 0 calc(3.2cqh * var(--sb-glow)) {t?.color}aa; text-align:center; min-width:3ch; display:inline-flex; align-items:center; justify-content:center;">{t?.score}</div>
						</div>

						<!-- Foul hierarchy: small muted label, prominent number -->
						<div class="flex flex-col items-center" style="gap:0.1cqh;">
							<div class="font-label" style="font-size:2.1cqh; color:#8d98ab; letter-spacing:0.18em;">Fouls</div>
							<div class="font-timer tabular-nums" style="font-size:5cqh; line-height:1; color:#eef2f9;">{t?.fouls}</div>
						</div>

						<div style="height:4.4cqh; display:flex; align-items:center; justify-content:center;">
							<span class="bonus-chip" style="font-size:2.4cqh; padding:0.45cqh 1.5cqh; letter-spacing:0.12em; opacity:{inBonus(t?.side) ? '1' : '0'}; transition:opacity 0.2s ease;">Bonus</span>
						</div>
					</div>
				{/each}

				{#if showDividers}<div class="sb-divider"></div>{/if}

				<!-- CENTER COLUMN: TOURNAMENT LOGO (if center mode) or CLOCK & INFO -->
				<div class="flex flex-col items-center justify-center" style="flex:0 0 27%; max-width:27%; gap:1.25cqh; padding-top:{centerColumnTopPad};">
					{#if showCenterLogo && centerLogo}
						<img src={logoSrc(centerLogo)} alt="" class="object-contain" style="height:31cqh; width:31cqh; margin-top:9.2cqh; filter:drop-shadow(0 0 calc(2cqh * var(--sb-glow)) rgba(8,12,24,0.56));" />
					{/if}

					<!-- Game clock — the focal point -->
					<div class="flex flex-col items-center" style="gap:1.9cqh;">
						<div class="font-timer tabular-nums" style="font-size:18.8cqh; line-height:0.9; color:#ffffff; text-align:center; text-shadow:0 0 calc(2.2cqh * var(--sb-glow)) rgba(120,170,255,0.5);">
							<Countdown timer={gameState.timer} />
						</div>
						<!-- amber underline accent -->
						<div style="width:10cqw; height:0.4cqh; margin-top:1.2cqh; background:#f59e0b; border-radius:0.3cqh; box-shadow:0 0 calc(1.05cqh * var(--sb-glow)) #f59e0b;"></div>
					</div>

					<div class="font-label" style="font-size:2.65cqh; color:#d8dfee;">Period {gameState.period}</div>

					<!-- Reserved space for shot clock (fixed height → no layout shift) -->
					<div style="height:13.2cqh; margin-top:1.6cqh; display:flex; align-items:center; justify-content:center; width:100%;">
						<div class="flex flex-col items-center justify-center" style="gap:0.3cqh; background:rgba(245,158,11,0.1); padding:1.2cqh 3cqw; border:0.28cqh solid #f59e0b; border-radius:0.6cqh; clip-path:polygon(1cqh 0,100% 0,100% calc(100% - 1cqh),calc(100% - 1cqh) 100%,0 100%,0 1cqh); min-width:18cqw; opacity:{gameState.shotClock.running ? '1' : '0'}; pointer-events:{gameState.shotClock.running ? 'auto' : 'none'}; transition:opacity 0.2s ease;">
							<div class="font-label" style="font-size:2.6cqh; color:#f59e0b; letter-spacing:0.2em;">Shot</div>
							<div class="font-timer tabular-nums" style="font-size:10.4cqh; line-height:1; color:#f59e0b; text-shadow:0 0 calc(2cqh * var(--sb-glow)) #f59e0b; text-align:center; display:inline-block; width:9.2cqw;">{shotClockSeconds}</div>
						</div>
					</div>

					<!-- Reserved space for possession arrow -->
					<div style="height:6.2cqh; margin-top:0.6cqh; display:flex; align-items:center; justify-content:center; gap:1.05cqw;">
						<div style="display:flex; align-items:center; justify-content:center; height:100%; aspect-ratio:1; font-size:4.8cqh; color:{gameState.possession?.direction === 'home' ? theme.homeColor : '#4a5568'}; text-shadow:{gameState.possession?.direction === 'home' ? `0 0 calc(1.6cqh * var(--sb-glow)) ${theme.homeColor}` : 'none'}; opacity:{gameState.possession?.visible ? '1' : '0'}; transition:all 0.3s ease;">◀</div>
						<div style="display:flex; align-items:center; justify-content:center; height:100%; font-family:'Oswald'; font-weight:500; font-size:2.35cqh; line-height:1; letter-spacing:0.2em; color:#c9d3e6; padding:0 0.55cqw; transform:translateY(0.24cqh); opacity:{gameState.possession?.visible ? '1' : '0'}; transition:all 0.3s ease;">POSS</div>
						<div style="display:flex; align-items:center; justify-content:center; height:100%; aspect-ratio:1; font-size:4.8cqh; color:{gameState.possession?.direction === 'away' ? theme.awayColor : '#4a5568'}; text-shadow:{gameState.possession?.direction === 'away' ? `0 0 calc(1.6cqh * var(--sb-glow)) ${theme.awayColor}` : 'none'}; opacity:{gameState.possession?.visible ? '1' : '0'}; transition:all 0.3s ease;">▶</div>
					</div>
				</div>

				{#if showDividers}<div class="sb-divider"></div>{/if}

				{#each [teams[1]] as t (t.side)}
					<!-- RIGHT COLUMN: AWAY TEAM -->
					<div class="flex flex-col items-center justify-center" style="flex:0 0 34%; max-width:34%; gap:{sideColumnGap};">
						{#if reserveTeamLogoSlot}
							<div class="flex items-center justify-center" style="height:25.5cqh; width:25.5cqh; margin-top:{sideLogoTopOffset};">
								{#if t?.logo}
									<img src={logoSrc(t.logo)} alt="" class="object-contain" style="height:100%; width:100%; filter:drop-shadow(0 0 calc(1.6cqh * var(--sb-glow)) rgba(8,12,24,0.6));" />
								{/if}
							</div>
						{/if}

						<div style="font-size:6cqh; line-height:1; color:#f4f6fb; font-family:'Oswald'; font-weight:700;">{t?.name}</div>

						<div style="height:{largeScoreMode ? '34cqh' : '28cqh'}; width:100%; display:flex; align-items:center; justify-content:center; margin:0.9cqh 0 0.7cqh;">
							<div class="font-score tabular-nums" style="font-size:{largeScoreMode ? '34cqh' : '27cqh'}; line-height:1; color:#f7faff; text-shadow:0 0.3cqh 0.4cqh rgba(5,10,18,0.5), 0 0 calc(3.2cqh * var(--sb-glow)) {t?.color}aa; text-align:center; min-width:3ch; display:inline-flex; align-items:center; justify-content:center;">{t?.score}</div>
						</div>

						<div class="flex flex-col items-center" style="gap:0.1cqh;">
							<div class="font-label" style="font-size:2.1cqh; color:#8d98ab; letter-spacing:0.18em;">Fouls</div>
							<div class="font-timer tabular-nums" style="font-size:5cqh; line-height:1; color:#eef2f9;">{t?.fouls}</div>
						</div>

						<div style="height:4.4cqh; display:flex; align-items:center; justify-content:center;">
							<span class="bonus-chip" style="font-size:2.4cqh; padding:0.45cqh 1.5cqh; letter-spacing:0.12em; opacity:{inBonus(t?.side) ? '1' : '0'}; transition:opacity 0.2s ease;">Bonus</span>
						</div>
					</div>
				{/each}

			</div>
		</div>
	</div>
</DisplayBase>
