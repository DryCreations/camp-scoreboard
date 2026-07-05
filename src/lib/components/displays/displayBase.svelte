<script>
	// Fixed-pixel root for every display. Width/height come straight from the
	// registry entry (targetWidth/targetHeight) in EXPLICIT px — not vw/vh — so
	// output is pixel-predictable and may exceed the real screen. That's exactly
	// what OBS's CEF browser source and Novastar capture want.
	//
	// Sound is handled globally by <SoundPlayer> (real audio files), not here —
	// this component only owns the visual animation layers, overlay, and ticker.
	import { logoSrc } from '$lib/logo.js';

	let { entry, theme, trigger, overlay, ticker, children } = $props();

	// Play the animation layer for a fixed duration whenever a trigger fires,
	// then auto-clear. A falsy animation just never flashes — a graceful no-op.
	let animClass = $state('');
	let showConfetti = $state(false);
	let lastSeq = 0;

	$effect(() => {
		const seq = trigger?.seq ?? 0;
		if (seq === lastSeq) return;
		lastSeq = seq;
		if (trigger?.animation === 'confetti') {
			// Long enough for chips to spawn across the full width and fall all the
			// way down, so the burst actually fills the screen.
			showConfetti = true;
			const t = setTimeout(() => (showConfetti = false), 5000);
			return () => clearTimeout(t);
		}
		if (trigger?.animation) {
			animClass = trigger.animation;
			const t = setTimeout(() => (animClass = ''), 1100);
			return () => clearTimeout(t);
		}
	});

	const confettiColors = [
		'#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#fff', '#06b6d4', '#ec4899'
	];
	// A dense field spread across the width, staggered so confetti keeps falling
	// for a few seconds rather than a single instant clump.
	const chips = Array.from({ length: 140 }, (_, i) => ({
		left: Math.random() * 100,
		delay: Math.random() * 2.4,
		duration: 2.8 + Math.random() * 1.8,
		rotation: Math.random() * 360,
		color: confettiColors[i % confettiColors.length]
	}));

	// Curated appearance knob: 0–100 glow intensity → a 0–1 multiplier exposed as
	// the CSS var --sb-glow. Display components scale their glow blur radii by it,
	// so presets/knobs restyle the look with no code changes.
	let glow = $derived(Math.max(0, Math.min(100, Number(theme?.glowIntensity ?? 40))) / 100);

	let backgroundFill = $derived.by(() => {
		// A background image (from the asset library) takes over, with a dark scrim
		// layered on top so foreground numerals stay readable.
		if (theme?.backgroundImage) {
			return `linear-gradient(rgba(6,9,15,0.5), rgba(6,9,15,0.72)), url("${logoSrc(theme.backgroundImage)}") center/cover no-repeat`;
		}
		const start = theme?.gradientStart || '#4f7fcc';
		const mid = theme?.gradientMid || '';
		const end = theme?.gradientEnd || '#213f74';
		const mode = theme?.gradientMode === 'linear' ? 'linear' : 'radial';
		if (mode === 'linear') {
			return mid
				? `linear-gradient(180deg, ${start} 0%, ${mid} 52%, ${end} 100%)`
				: `linear-gradient(180deg, ${start} 0%, ${end} 100%)`;
		}
		const center = theme?.gradientCenter || '50% 38%';
		const size = theme?.gradientSize || '125% 110%';
		return mid
			? `radial-gradient(${size} at ${center}, ${start} 0%, ${mid} 52%, ${end} 100%)`
			: `radial-gradient(${size} at ${center}, ${start} 0%, ${end} 100%)`;
	});
</script>

<div
	class="chrome-panel relative overflow-hidden text-white"
	style="width:{entry.targetWidth}px; height:{entry.targetHeight}px; container-type:size; background:{backgroundFill}; --sb-glow:{glow};"
>
	{@render children()}

	<!-- Confetti burst -->
	{#if showConfetti}
		<div class="pointer-events-none absolute inset-0" style="z-index:40;">
			{#each chips as c}
				<span
					class="confetti-chip"
					style="left:{c.left}%; background:{c.color}; animation-delay:{c.delay}s; animation-duration:{c.duration}s; transform:rotate({c.rotation}deg);"
				></span>
			{/each}
		</div>
	{/if}

	<!-- Full-bleed flash overlay (buzzer / shot-clock) -->
	<div class="pointer-events-none absolute inset-0 {animClass}" style="opacity:0"></div>

	<!-- Manual operator overlay: full-width banner with centered content and top/bottom lines -->
	{#if overlay?.active}
		<div
			class="pointer-events-none absolute left-0 right-0 flex items-center justify-center"
			style="top:8cqh; background:linear-gradient(180deg, rgba(6,8,12,0.95) 0%, rgba(6,8,12,0.7) 100%); padding:2cqh 0; z-index:50;"
		>
			<div
				class="flex items-center justify-center text-center"
				style="padding:2cqh 6cqw; border-top:0.4cqh solid {theme?.homeColor ?? '#2563eb'}; border-bottom:0.4cqh solid {theme?.awayColor ?? '#dc2626'};"
			>
				<span class="font-label" style="font-size:8cqh; letter-spacing:0.12em; color:#f4f6fb;">
					{overlay.label || ''}
				</span>
			</div>
		</div>
	{/if}

	<!-- Persistent news-style ticker along the bottom -->
	{#if ticker?.active && ticker?.text}
		<div class="ticker-bar" style="border-top:0.3cqh solid {theme?.homeColor ?? '#2563eb'};">
			<div class="ticker-track font-timer" style="font-size:5cqh;">
				<span style="padding-right:8cqw;">{ticker.text}</span>
				<span style="padding-right:8cqw;">{ticker.text}</span>
				<span style="padding-right:8cqw;">{ticker.text}</span>
			</div>
		</div>
	{/if}
</div>
