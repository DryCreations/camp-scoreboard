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

function managedToken(value) {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

function cropTopLeftToSlot(sourceWidth, sourceHeight, slotWidth, slotHeight) {
	const srcW = Math.max(1, Number(sourceWidth) || 1);
	const srcH = Math.max(1, Number(sourceHeight) || 1);
	const dstW = Math.max(1, Number(slotWidth) || 1);
	const dstH = Math.max(1, Number(slotHeight) || 1);
	return {
		cropLeft: 0,
		cropTop: 0,
		cropRight: Math.max(0, srcW - dstW),
		cropBottom: Math.max(0, srcH - dstH)
	};
}

export function managedNamesForDisplay(displayIdOrSlotKey) {
	const token = managedToken(displayIdOrSlotKey) || 'display';
	return {
		subSceneName: `camp-screen-${token}`,
		browserSourceName: `camp-browser-${token}`
	};
}

function managedFeedSourceName(displayIdOrSlotKey, feedKey) {
	const displayToken = managedToken(displayIdOrSlotKey) || 'display';
	const feedToken = managedToken(feedKey) || 'feed';
	return `camp-feed-${displayToken}-${feedToken}`;
}

export function switchScene(sceneName) {
	if (!sceneName) return Promise.resolve(false);
	return safeCall(() => obs.call('SetCurrentProgramScene', { sceneName }));
}

async function toggleSourceRaw(sceneName, sourceName, enabled) {
	const { sceneItemId } = await obs.call('GetSceneItemId', { sceneName, sourceName });
	await obs.call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: enabled });
}

export function toggleSource(sceneName, sourceName, enabled) {
	return safeCall(() => toggleSourceRaw(sceneName, sourceName, enabled));
}

async function getSceneItemId(sceneName, sourceName) {
	const { sceneItemId } = await obs.call('GetSceneItemId', { sceneName, sourceName });
	return sceneItemId;
}

async function getSceneItemTransform(sceneName, sourceName) {
	const sceneItemId = await getSceneItemId(sceneName, sourceName);
	const { sceneItemTransform } = await obs.call('GetSceneItemTransform', {
		sceneName,
		sceneItemId
	});
	return sceneItemTransform ?? {};
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

async function ensureScene(sceneName) {
	try {
		await obs.call('CreateScene', { sceneName });
	} catch (err) {
		const msg = String(err?.message ?? '');
		if (!msg.toLowerCase().includes('already exists')) {
			throw err;
		}
	}
}

async function upsertBrowserSourceRaw({ sceneName, sourceName, url, width, height }) {
	if (!sceneName || !sourceName || !url) return;
	const targetWidth = Math.max(320, Math.floor(Number(width) || 1920));
	const targetHeight = Math.max(180, Math.floor(Number(height) || 1080));

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
}

export function upsertBrowserSource({ sceneName, sourceName, url, width, height }) {
	return safeCall(() => upsertBrowserSourceRaw({ sceneName, sourceName, url, width, height }));
}

async function setSourceTransformRaw(sceneName, sourceName, transform) {
	if (!sceneName || !sourceName || !transform) return;
	await ensureSceneItem(sceneName, sourceName);
	const sceneItemId = await getSceneItemId(sceneName, sourceName);
	await obs.call('SetSceneItemTransform', {
		sceneName,
		sceneItemId,
		sceneItemTransform: transform
	});
}

export function setSourceTransform(sceneName, sourceName, transform) {
	return safeCall(() => setSourceTransformRaw(sceneName, sourceName, transform));
}

async function setSourcesVisibilityBatchRaw(sceneName, updates = []) {
	if (!sceneName || !Array.isArray(updates) || updates.length === 0) return;
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
}

export function setSourcesVisibilityBatch(sceneName, updates = []) {
	return safeCall(() => setSourcesVisibilityBatchRaw(sceneName, updates));
}

export function applyManagedWallLayout(mainSceneName, items = []) {
	if (!mainSceneName || !Array.isArray(items) || items.length === 0) return Promise.resolve(false);
	return safeCall(async () => {
		await ensureScene(mainSceneName);
		for (const item of items) {
			if (!item?.displayId || !item?.url) continue;
			const width = Math.max(16, Math.floor(Number(item.width) || 0));
			const height = Math.max(16, Math.floor(Number(item.height) || 0));
			const slotWidth = Math.max(16, Math.floor(Number(item.slotWidth) || width));
			const slotHeight = Math.max(16, Math.floor(Number(item.slotHeight) || height));
			const slotKey = managedToken(item.slotKey) || managedToken(item.displayId);
			const { subSceneName, browserSourceName } = managedNamesForDisplay(slotKey);
			const feeds = item.feeds && typeof item.feeds === 'object' ? item.feeds : null;
			const activeFeed = managedToken(item.activeFeed || '');

			await ensureScene(subSceneName);
			if (feeds && Object.keys(feeds).length) {
				const updates = [];
				for (const [feedKey, feedUrl] of Object.entries(feeds)) {
					if (!feedUrl) continue;
					const feedSourceName = managedFeedSourceName(slotKey, feedKey);
					await upsertBrowserSourceRaw({
						sceneName: subSceneName,
						sourceName: feedSourceName,
						url: String(feedUrl),
						width,
						height
					});
					await setSourceTransformRaw(subSceneName, feedSourceName, {
						positionX: 0,
						positionY: 0,
						scaleX: 1,
						scaleY: 1,
						cropTop: 0,
						cropBottom: 0,
						cropLeft: 0,
						cropRight: 0,
						boundsType: 'OBS_BOUNDS_STRETCH',
						boundsWidth: width,
						boundsHeight: height
					});
					updates.push({
						source: feedSourceName,
						enabled:
							activeFeed && managedToken(feedKey) === activeFeed
								? true
								: !activeFeed && updates.length === 0
					});
				}
				if (updates.length) {
					await setSourcesVisibilityBatchRaw(subSceneName, updates);
				}
			} else {
				await upsertBrowserSourceRaw({
					sceneName: subSceneName,
					sourceName: browserSourceName,
					url: item.url,
					width,
					height
				});

				// Keep each managed subscene tightly framed to its intended dimensions.
				await setSourceTransformRaw(subSceneName, browserSourceName, {
					positionX: 0,
					positionY: 0,
					scaleX: 1,
					scaleY: 1,
					cropTop: 0,
					cropBottom: 0,
					cropLeft: 0,
					cropRight: 0,
					boundsType: 'OBS_BOUNDS_STRETCH',
					boundsWidth: width,
					boundsHeight: height
				});
			}

			await ensureSceneItem(mainSceneName, subSceneName);

			const mainSceneItemTransform = await getSceneItemTransform(mainSceneName, subSceneName);
			const sourceFrameWidth =
				Math.max(1, Math.floor(Number(mainSceneItemTransform.sourceWidth) || 0)) || width;
			const sourceFrameHeight =
				Math.max(1, Math.floor(Number(mainSceneItemTransform.sourceHeight) || 0)) || height;

			const autoCrop = cropTopLeftToSlot(sourceFrameWidth, sourceFrameHeight, slotWidth, slotHeight);
			const manualCropLeft = Math.max(0, Math.floor(Number(item.cropLeft) || 0));
			const manualCropRight = Math.max(0, Math.floor(Number(item.cropRight) || 0));
			const manualCropTop = Math.max(0, Math.floor(Number(item.cropTop) || 0));
			const manualCropBottom = Math.max(0, Math.floor(Number(item.cropBottom) || 0));

			const cropLeft = Math.min(sourceFrameWidth - 1, autoCrop.cropLeft + manualCropLeft);
			const cropRight = Math.min(
				sourceFrameWidth - 1 - cropLeft,
				autoCrop.cropRight + manualCropRight
			);
			const cropTop = Math.min(sourceFrameHeight - 1, autoCrop.cropTop + manualCropTop);
			const cropBottom = Math.min(
				sourceFrameHeight - 1 - cropTop,
				autoCrop.cropBottom + manualCropBottom
			);

			const visibleWidth = Math.max(1, sourceFrameWidth - cropLeft - cropRight);
			const visibleHeight = Math.max(1, sourceFrameHeight - cropTop - cropBottom);
			const baseScaleX = slotWidth / visibleWidth;
			const baseScaleY = slotHeight / visibleHeight;

			await setSourceTransformRaw(mainSceneName, subSceneName, {
				positionX: Number(item.x) || 0,
				positionY: Number(item.y) || 0,
				scaleX: baseScaleX * (Number(item.scaleX) || 1),
				scaleY: baseScaleY * (Number(item.scaleY) || 1),
				cropTop,
				cropBottom,
				cropLeft,
				cropRight,
				boundsType: 'OBS_BOUNDS_NONE',
				boundsWidth: slotWidth,
				boundsHeight: slotHeight
			});

			await toggleSourceRaw(mainSceneName, subSceneName, item.enabled ?? true);
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
