<script>
	import { store, emit } from '$lib/socketClient.svelte.js';

	// Fixed message bars across the top and bottom of every display. Type the
	// message and Show; it stays up (and survives restarts) until Hide. Size and
	// colors are on /settings -> Banners.
	const banners = [
		{ key: 'Top', label: 'Top banner' },
		{ key: 'Bottom', label: 'Bottom banner' }
	];

	let theme = $derived(store.state.theme ?? {});
	let drafts = $state({ Top: '', Bottom: '' });
	let initialized = false;

	// Seed the inputs from the saved text once, then let the operator edit freely.
	$effect(() => {
		if (!initialized && store.state?.theme) {
			drafts = {
				Top: store.state.theme.bannerTopText ?? '',
				Bottom: store.state.theme.bannerBottomText ?? ''
			};
			initialized = true;
		}
	});

	function show(key) {
		emit('theme:update', { [`banner${key}Text`]: drafts[key].trim(), [`banner${key}On`]: true });
	}
	function hide(key) {
		emit('theme:update', { [`banner${key}On`]: false });
	}
</script>

<section class="ctl-card">
	<h2 class="ctl-h mb-3">Banners</h2>

	{#each banners as b, i}
		<div class={i === 0 ? 'mb-4' : ''}>
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-white/80">{b.label}</span>
				<span
					class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
					style={theme[`banner${b.key}On`] ? 'background:#166534;color:#dcfce7;' : 'background:#26303c;color:#8b95a6;'}
				>
					{theme[`banner${b.key}On`] ? 'On air' : 'Off'}
				</span>
			</div>
			<input
				class="ctl-input mb-2 w-full"
				placeholder="Message…"
				bind:value={drafts[b.key]}
				onkeydown={(e) => e.key === 'Enter' && show(b.key)}
			/>
			<div class="grid grid-cols-2 gap-2">
				<button class="ctl-btn" style="background:#166534;" onclick={() => show(b.key)}>Show</button>
				<button class="ctl-btn" onclick={() => hide(b.key)}>Hide</button>
			</div>
		</div>
	{/each}
</section>
