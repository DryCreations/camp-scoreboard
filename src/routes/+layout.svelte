<script>
	import '../app.css';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Unified button press feedback: every `.ctl-btn` anywhere in the app gets the
	// exact same click animation via one delegated listener — no per-button setup,
	// and impossible for a button to be inconsistent or forgotten. The `.btn-flash`
	// afterglow (app.css) pairs with the `:active` sink for a clear "pressed" cue.
	onMount(() => {
		const onDown = (e) => {
			const btn = e.target?.closest?.('.ctl-btn');
			if (!btn) return;
			btn.classList.remove('btn-flash');
			void btn.offsetWidth; // reflow so the animation retriggers on rapid taps
			btn.classList.add('btn-flash');
		};
		document.addEventListener('pointerdown', onDown);
		return () => document.removeEventListener('pointerdown', onDown);
	});
</script>

{@render children()}
