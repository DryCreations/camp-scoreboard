<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Persistent bottom-of-screen ticker (news-broadcast crawl). Set the text and
	// toggle it on/off — it keeps scrolling on every display until hidden.
	let ticker = $derived(store.state.ticker ?? { active: false, text: '' });
	let draft = $state('');
	let initialized = false;

	// Seed the input from server state once, then let the operator edit freely.
	$effect(() => {
		if (!initialized && store.state?.ticker) {
			draft = store.state.ticker.text ?? '';
			initialized = true;
		}
	});

	function show() {
		emit('ticker:update', { text: draft.trim(), active: true });
	}
	function hide() {
		emit('ticker:update', { active: false });
	}
</script>

<section class="ctl-card">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="ctl-h">Ticker</h2>
		<span
			class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
			style={ticker.active ? 'background:#166534;color:#dcfce7;' : 'background:#26303c;color:#8b95a6;'}
		>
			{ticker.active ? 'On air' : 'Off'}
		</span>
	</div>

	<input
		class="ctl-input mb-3 w-full"
		placeholder="Scrolling message…"
		bind:value={draft}
		onkeydown={(e) => e.key === 'Enter' && show()}
	/>
	<div class="grid grid-cols-2 gap-2">
		<button class="ctl-btn" style="background:#166534;" onclick={show}>Show</button>
		<button class="ctl-btn" onclick={hide}>Hide</button>
	</div>
</section>
