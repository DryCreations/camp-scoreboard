<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Possession arrow: which team has the ball. Toggle visibility and flip the
	// direction. It sits in the reserved space under the shot clock on the
	// scoreboard, so it never shifts the layout.
	let p = $derived(store.state.possession ?? { visible: false, direction: 'home' });
	let homeName = $derived(store.state.theme.homeName);
	let awayName = $derived(store.state.theme.awayName);

	// Tapping the direction that's already showing hides the arrow — same
	// toggle-on-reclick behavior as the overlay presets.
	function setDir(direction) {
		if (p.visible && p.direction === direction) emit('possession:update', { visible: false });
		else emit('possession:update', { direction, visible: true });
	}
	function toggle() {
		emit('possession:update', { visible: !p.visible });
	}
</script>

<section class="ctl-card">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="ctl-h">Possession</h2>
		<span
			class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
			style={p.visible ? 'background:#166534;color:#dcfce7;' : 'background:#26303c;color:#8b95a6;'}
		>
			{p.visible ? 'Shown' : 'Hidden'}
		</span>
	</div>

	<div class="mb-2 grid grid-cols-2 gap-2">
		<button
			class="ctl-btn"
			style={p.visible && p.direction === 'home' ? 'background:#1d4ed8;' : ''}

			onclick={() => setDir('home')}
		>
			◀ {homeName}
		</button>
		<button
			class="ctl-btn"
			style={p.visible && p.direction === 'away' ? 'background:#1d4ed8;' : ''}

			onclick={() => setDir('away')}
		>
			{awayName} ▶
		</button>
	</div>
	<button class="ctl-btn w-full" onclick={toggle}>
		{p.visible ? 'Hide arrow' : 'Show arrow'}
	</button>
</section>
