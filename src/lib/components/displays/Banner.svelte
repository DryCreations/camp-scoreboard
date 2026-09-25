<script>
	// A fixed message bar across the top or bottom of a display (set up on
	// /settings, shown/hidden from /control). It takes real space: displayBase
	// lays it out beside the view, so the scoreboard shrinks to fit instead of
	// being covered. Text that's too wide for the screen scales down to fit.
	let { text, size = 5, color = '#f4f6fb', bg = '#0b0f16' } = $props();

	let box = $state();
	let label = $state();
	let scale = $state(1);

	function fit() {
		if (!box || !label) return;
		const style = getComputedStyle(box);
		const avail = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
		// offsetWidth ignores the transform, so this is always the natural width.
		const natural = label.offsetWidth;
		scale = natural > avail && natural > 0 ? avail / natural : 1;
	}

	$effect(() => {
		text;
		size;
		fit();
		// Oswald loads asynchronously; measure again once it's in.
		document.fonts?.ready.then(fit);
		const ro = new ResizeObserver(fit);
		ro.observe(box);
		return () => ro.disconnect();
	});
</script>

<div
	bind:this={box}
	style="flex:0 0 auto; height:calc({size}cqh * 1.6); background:{bg}; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:0 2cqw; position:relative; z-index:6;"
>
	<span
		bind:this={label}
		style="display:inline-block; white-space:nowrap; font-family:'Oswald', sans-serif; font-weight:600; letter-spacing:0.06em; font-size:{size}cqh; line-height:1; color:{color}; transform:scale({scale});"
		>{text}</span
	>
</div>
