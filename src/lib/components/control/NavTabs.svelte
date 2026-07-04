<script>
	import { page } from '$app/stores';
	import { store } from '$lib/socketClient.svelte.js';

	// Two-view switch: live board control vs. visual/sound settings.
	let path = $derived($page.url.pathname);
	const tabs = [
		{ href: '/control', label: 'Control' },
		{ href: '/obs', label: 'OBS' },
		{ href: '/settings', label: 'Settings' }
	];
</script>

<header
	class="sticky top-0 z-20 -mx-3 mb-4 flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3"
	style="background:linear-gradient(180deg,var(--chrome-900),rgba(10,12,16,0.85)); backdrop-filter:blur(6px);"
>
	<div class="flex flex-1 gap-1 rounded-xl p-1" style="background:#0c0f15;">
		{#each tabs as t}
			<a
				href={t.href}
				class="flex-1 rounded-lg py-2 text-center font-timer text-sm"
				style={path === t.href ? 'background:#232a36;color:#fff;' : 'color:#8b95a6;'}
			>
				{t.label}
			</a>
		{/each}
	</div>
	<span
		class="rounded-full px-3 py-1 text-center text-xs font-semibold"
		style={store.connected ? 'background:#166534;color:#dcfce7;' : 'background:#7f1d1d;color:#fecaca;'}
	>
		{store.connected ? 'Connected' : 'Offline'}
	</span>
</header>
