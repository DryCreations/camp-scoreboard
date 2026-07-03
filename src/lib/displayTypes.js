import ScoreboardView from './components/displays/ScoreboardView.svelte';
import ClockView from './components/displays/ClockView.svelte';
import ScoreOnlyView from './components/displays/ScoreOnlyView.svelte';

// THE display type registry. `/display/[id]` looks up an entry's `type` here to
// decide what to render. Adding a new display type later = write one component
// and add one line below. Never a new route.
export const displayTypes = {
	scoreboard: ScoreboardView,
	clock: ClockView,
	score: ScoreOnlyView
};

// Types offered in the control panel's "add display" dropdown.
export const displayTypeOptions = Object.keys(displayTypes);
