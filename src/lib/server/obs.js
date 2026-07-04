import OBSWebSocket from 'obs-websocket-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Server-side OBS control. Every public method is wrapped so that if OBS is
// offline or misbehaving it logs and no-ops — it must NEVER throw or block the
// Socket.io broadcast path. Scene/source names are discovered live from OBS or
// come from trigger config, never hardcoded here.
//
// OBS is expected to run on the SAME machine as this server, so we default to
// 127.0.0.1. Override host/port/password via .env if needed.

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath, override: true });

let fileEnv = {};
try {
	if (fs.existsSync(envPath)) {
		fileEnv = dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
	}
} catch {
	fileEnv = {};
}

function readEnv(name, fallback = '') {
	const v = fileEnv[name] ?? process.env[name] ?? fallback;
	return String(v).trim();
}

const obs = new OBSWebSocket();
let connected = false;

const host = readEnv('OBS_HOST', '127.0.0.1') || '127.0.0.1';
const port = Number(readEnv('OBS_PORT', '4455')) || 4455;
const url = `ws://${host}:${port}`;
const password = readEnv('OBS_PASSWORD', '') || undefined;

console.log(
	`[obs] target=${url} password=${password ? 'set' : 'empty'} env=${envPath}`
);

async function connect() {
	try {
		await obs.connect(url, password);
		connected = true;
		console.log('[obs] connected', url);
	} catch (err) {
		connected = false;
		// Expected when OBS isn't running — retry quietly in the background.
		console.warn('[obs] not connected (will retry):', err?.message ?? err);
	}
}

obs.on('ConnectionClosed', () => {
	if (connected) console.warn('[obs] connection closed, will retry');
	connected = false;
});

// Kick off an initial connect and retry loop. Never awaited by callers.
connect();
setInterval(() => {
	if (!connected) connect();
}, 10_000);

async function safeCall(fn) {
	if (!connected) return false;
	try {
		await fn();
		return true;
	} catch (err) {
		console.warn('[obs] call failed:', err?.message ?? err);
		return false;
	}
}

export function switchScene(sceneName) {
	if (!sceneName) return Promise.resolve(false);
	return safeCall(() => obs.call('SetCurrentProgramScene', { sceneName }));
}

export function toggleSource(sceneName, sourceName, enabled) {
	return safeCall(async () => {
		const { sceneItemId } = await obs.call('GetSceneItemId', { sceneName, sourceName });
		await obs.call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: enabled });
	});
}

async function getSceneItemId(sceneName, sourceName) {
	const { sceneItemId } = await obs.call('GetSceneItemId', { sceneName, sourceName });
	return sceneItemId;
}

async function ensureSceneItem(sceneName, sourceName) {
	try {
		await getSceneItemId(sceneName, sourceName);
		return;
	} catch {
		await obs.call('CreateSceneItem', {
			sceneName,
			sourceName,
			sceneItemEnabled: true
		});
	}
}

export function upsertBrowserSource({ sceneName, sourceName, url, width, height }) {
	if (!sceneName || !sourceName || !url) return Promise.resolve(false);
	const targetWidth = Math.max(320, Math.floor(Number(width) || 1920));
	const targetHeight = Math.max(180, Math.floor(Number(height) || 1080));

	return safeCall(async () => {
		let existingKind = null;
		try {
			const info = await obs.call('GetInputSettings', { inputName: sourceName });
			existingKind = info?.inputKind ?? null;
		} catch {
			existingKind = null;
		}

		const inputSettings = {
			url,
			width: targetWidth,
			height: targetHeight,
			restart_when_active: true,
			shutdown: false,
			reroute_audio: false,
			css: ''
		};

		if (!existingKind) {
			await obs.call('CreateInput', {
				sceneName,
				inputName: sourceName,
				inputKind: 'browser_source',
				inputSettings,
				sceneItemEnabled: true
			});
			return;
		}

		if (existingKind !== 'browser_source') {
			throw new Error(`input "${sourceName}" exists but is ${existingKind}`);
		}

		await obs.call('SetInputSettings', {
			inputName: sourceName,
			inputSettings,
			overlay: true
		});
		await ensureSceneItem(sceneName, sourceName);
	});
}

export function setSourceTransform(sceneName, sourceName, transform) {
	if (!sceneName || !sourceName || !transform) return Promise.resolve(false);
	return safeCall(async () => {
		await ensureSceneItem(sceneName, sourceName);
		const sceneItemId = await getSceneItemId(sceneName, sourceName);
		await obs.call('SetSceneItemTransform', {
			sceneName,
			sceneItemId,
			sceneItemTransform: transform
		});
	});
}

export function setSourcesVisibilityBatch(sceneName, updates = []) {
	if (!sceneName || !Array.isArray(updates) || updates.length === 0) return Promise.resolve(false);
	return safeCall(async () => {
		for (const update of updates) {
			if (!update?.source) continue;
			await ensureSceneItem(sceneName, update.source);
			const sceneItemId = await getSceneItemId(sceneName, update.source);
			await obs.call('SetSceneItemEnabled', {
				sceneName,
				sceneItemId,
				sceneItemEnabled: !!update.enabled
			});
		}
	});
}

export function isConnected() {
	return connected;
}

/**
 * Snapshot of OBS for the control panel's live remote: scene list, current
 * program scene, and the sources (with visibility) in that scene. Returns a
 * disconnected shape rather than throwing when OBS is offline.
 */
export async function fetchObsState(selectedSceneName = null) {
	if (!connected) {
		return { connected: false, scenes: [], currentScene: null, selectedScene: null, sources: [] };
	}
	try {
		const { scenes, currentProgramSceneName } = await obs.call('GetSceneList');
		// OBS returns scenes bottom-to-top; reverse to match the UI order.
		const sceneNames = scenes.map((s) => s.sceneName).reverse();
		const selectedScene =
			selectedSceneName && sceneNames.includes(selectedSceneName)
				? selectedSceneName
				: currentProgramSceneName;

		let sources = [];
		if (selectedScene) {
			const { sceneItems } = await obs.call('GetSceneItemList', {
				sceneName: selectedScene
			});
			sources = sceneItems.map((i) => ({
				name: i.sourceName,
				enabled: i.sceneItemEnabled
			}));
		}
		return {
			connected: true,
			scenes: sceneNames,
			currentScene: currentProgramSceneName,
			selectedScene,
			sources
		};
	} catch (err) {
		console.warn('[obs] fetch state failed:', err?.message ?? err);
		return { connected: false, scenes: [], currentScene: null, selectedScene: null, sources: [] };
	}
}

/** Dispatch an OBS action object from a trigger definition. */
export function runObsAction(action) {
	if (!action || !action.action || action.action === 'none') return Promise.resolve(false);
	switch (action.action) {
		case 'switchScene':
			return switchScene(action.scene);
		case 'toggleSource':
			return toggleSource(action.scene, action.source, action.enabled ?? true);
		default:
			console.warn('[obs] unknown action:', action.action);
			return Promise.resolve(false);
	}
}
