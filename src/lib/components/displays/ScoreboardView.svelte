<script>
	import DisplayBase from './displayBase.svelte';
	import Countdown from './Countdown.svelte';
	import { logoSrc } from '$lib/logo.js';
	import { msToSeconds, remainingMsFrom } from '$lib/time.js';
	import { serverNow } from '$lib/socketClient.svelte.js';

	// Broadcast-style main scoreboard. Score is the hero (tall condensed Anton
	// numerals over a faint LED grid); the timer is the centered Oswald readout.
	// Team colors drive the accents. All sizing uses container-query units so the
	// layout scales to whatever targetWidth/targetHeight the registry defines.
	let { entry, state: gameState, trigger } = $props();

	let theme = $derived(gameState.theme);
	let currentTime = $state.raw(serverNow());

	$effect(() => {
		const i = setInterval(() => (currentTime = serverNow()), 100);
		return () => clearInterval(i);
	});

	let shotClockSeconds = $derived(msToSeconds(remainingMsFrom(gameState.shotClock, currentTime)));

	let hasTeamLogos = $derived(teams[0]?.logo && teams[1]?.logo);
	let centerLogo = $derived(theme.centerLogo);
	let showCenterLogo = $derived(!hasTeamLogos && centerLogo);

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
</script>

<DisplayBase {entry} {theme} {trigger} overlay={gameState.overlay} ticker={gameState.ticker}>
	<div class="led-grid flex h-full w-full flex-col items-center justify-center relative">
		<!-- Top stripe with team colors -->
		<div style="position:absolute; top:0; left:0; right:0; height:1cqh; display:flex; gap:0; z-index:5;">
			<div style="flex:1; background:{theme.homeColor};"></div>
			<div style="flex:1; background:{theme.awayColor};"></div>
		</div>

		<div class="flex-1 flex w-full flex-col items-center justify-center" style="padding:1cqh 1.5cqw;">
			<!-- 3-column layout: Left Score | Center Content | Right Score -->
			<div class="flex w-full items-center justify-center" style="gap:2cqw; flex:1;">
				
				<!-- LEFT COLUMN: HOME TEAM -->
				<div class="flex flex-1 flex-col items-center justify-center" style="gap:{hasTeamLogos ? '1.8cqh' : '1.2cqh'};">
					<!-- Fixed-height logo space (only if logo exists) -->
					{#if teams[0]?.logo}
						<div class="flex items-center justify-center" style="height:35cqh; width:35cqh;">
							<img
								src={logoSrc(teams[0].logo)}
								alt=""
								class="object-contain"
								style="height:100%; width:100%; filter:drop-shadow(0 0 1.5cqh rgba(8,12,24,0.6));"
							/>
						</div>
					{/if}
					
					<div style="font-size:6cqh; line-height:1; color:#f4f6fb; font-family:'Oswald'; font-weight:700;">
						{teams[0]?.name}
					</div>
					
					<div class="font-score tabular-nums" style="font-size:{showCenterLogo ? '48cqh' : '32cqh'}; line-height:0.85; color:#f7faff; text-shadow:0 0 2.2cqh #ffffff55, 0 0 6cqh {teams[0]?.color}88, 0 0 9cqh {teams[0]?.color}55; margin:3.5cqh 0;">
						{teams[0]?.score}
					</div>
					
					<div class="font-label" style="font-size:3cqh; color:#d7dfef; letter-spacing:0.1em;">
						FOULS: {teams[0]?.fouls}
					</div>
				</div>

				<!-- CENTER COLUMN: TOURNAMENT LOGO (if center mode) or TIMER & INFO -->
				<div class="flex flex-1 flex-col items-center justify-center" style="gap:2cqh;">
					{#if showCenterLogo}
						<!-- Tournament logo at top of center column -->
						{#if centerLogo}
							<img
								src={logoSrc(centerLogo)}
								alt=""
								class="object-contain"
								style="height:38cqh; width:38cqh; filter:drop-shadow(0 0 2cqh rgba(8,12,24,0.6));"
							/>
						{/if}
					{/if}
					
					<!-- Timer content -->
					<div class="font-timer tabular-nums" style="font-size:18cqh; line-height:1; color:#f4f6fb;">
						<Countdown timer={gameState.timer} />
					</div>
					
					<div class="font-label" style="font-size:3cqh; color:#d8dfee;">
						Period {gameState.period}
					</div>
					
					<!-- Reserved space for shot clock (prevents layout shift) - uses height not min-height -->
					<div style="height:18.4cqh; display:flex; align-items:center; justify-content:center;">
						<div class="flex flex-col items-center justify-center" style="gap:0.4cqh; background:rgba(245,158,11,0.12); padding:1.5cqh 3cqw; border:0.35cqh solid #f59e0b; border-radius:2cqh; min-width:18cqw; opacity:{gameState.shotClock.running ? '1' : '0'}; pointer-events:{gameState.shotClock.running ? 'auto' : 'none'}; transition:opacity 0.2s ease;">
							<div class="font-label" style="font-size:4cqh; color:#f59e0b; letter-spacing:0.15em;">SHOT</div>
							<!-- Fixed-width digit box so 1- vs 2-digit numbers never resize the badge. -->
							<div class="font-timer tabular-nums" style="font-size:14cqh; line-height:1; color:#f59e0b; text-shadow:0 0 2cqh #f59e0b55, 0 0 6cqh #f59e0b33; text-align:center; display:inline-block; width:11cqw;">
								{shotClockSeconds}
							</div>
						</div>
					</div>

					<!-- Reserved space for the possession arrow - uses height not min-height, opacity for visibility -->
					<div style="height:9cqh; display:flex; align-items:center; justify-content:center; gap:1.2cqw;">
						<!-- Left arrow (lights up when home has possession) -->
						<div style="display:flex; align-items:center; justify-content:center; height:100%; aspect-ratio:1; font-size:6.5cqh; color:{gameState.possession?.direction === 'home' ? theme.homeColor : '#4a5568'}; text-shadow:{gameState.possession?.direction === 'home' ? `0 0 2cqh ${theme.homeColor}99` : 'none'}; opacity:{gameState.possession?.visible ? '1' : '0'}; pointer-events:{gameState.possession?.visible ? 'auto' : 'none'}; transition:all 0.3s ease;">
							◀
						</div>
						<!-- POSS label -->
						<div style="display:flex; align-items:center; justify-content:center; height:100%; font-family:'Oswald'; font-weight:500; font-size:3cqh; letter-spacing:0.2em; color:#c9d3e6; padding:0 0.6cqw; opacity:{gameState.possession?.visible ? '1' : '0'}; pointer-events:{gameState.possession?.visible ? 'auto' : 'none'}; transition:all 0.3s ease;">POSS</div>
						<!-- Right arrow (lights up when away has possession) -->
						<div style="display:flex; align-items:center; justify-content:center; height:100%; aspect-ratio:1; font-size:6.5cqh; color:{gameState.possession?.direction === 'away' ? theme.awayColor : '#4a5568'}; text-shadow:{gameState.possession?.direction === 'away' ? `0 0 2cqh ${theme.awayColor}99` : 'none'}; opacity:{gameState.possession?.visible ? '1' : '0'}; pointer-events:{gameState.possession?.visible ? 'auto' : 'none'}; transition:all 0.3s ease;">
							▶
						</div>
					</div>
				</div>

				<!-- RIGHT COLUMN: AWAY TEAM -->
				<div class="flex flex-1 flex-col items-center justify-center" style="gap:{hasTeamLogos ? '1.8cqh' : '1.2cqh'};">
					<!-- Fixed-height logo space (only if logo exists) -->
					{#if teams[1]?.logo}
						<div class="flex items-center justify-center" style="height:35cqh; width:35cqh;">
							<img
								src={logoSrc(teams[1].logo)}
								alt=""
								class="object-contain"
								style="height:100%; width:100%; filter:drop-shadow(0 0 1.5cqh rgba(8,12,24,0.6));"
							/>
						</div>
					{/if}
					
					<div style="font-size:6cqh; line-height:1; color:#f4f6fb; font-family:'Oswald'; font-weight:700;">
						{teams[1]?.name}
					</div>
					
					<div class="font-score tabular-nums" style="font-size:{showCenterLogo ? '48cqh' : '32cqh'}; line-height:0.85; color:#f7faff; text-shadow:0 0 2.2cqh #ffffff55, 0 0 6cqh {teams[1]?.color}88, 0 0 9cqh {teams[1]?.color}55; margin:3.5cqh 0;">
						{teams[1]?.score}
					</div>
					
					<div class="font-label" style="font-size:3cqh; color:#d7dfef; letter-spacing:0.1em;">
						FOULS: {teams[1]?.fouls}
					</div>
				</div>

			</div>
		</div>
	</div>
</DisplayBase>
