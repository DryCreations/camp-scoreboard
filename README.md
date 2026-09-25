# Camp Scoreboard

A self-hosted, local-network scoreboard system for a summer camp. Runs entirely offline,
is controlled from a phone or iPad, and drives any number of synchronized displays (a 4K
main scoreboard, a clock-only screen, a score-only screen, and more you can add live). It
also has a shot clock, team fouls, a manual overlay, momentary triggers (buzzer / confetti
/ shot-clock violation), and direct live OBS control.

Built with SvelteKit + Socket.io + Tailwind. Fonts (Anton, Oswald) are bundled locally, so
the whole thing works with **no internet connection**. Cross-platform: developed on
Windows, deployed on macOS. No database — config is a single JSON file.

## Quick start: one double-click (Windows or Mac)

Put one launcher file on the Desktop. Double-clicking it:

1. Downloads the app the first time (to `~/CampScoreboard`, or `%USERPROFILE%\CampScoreboard`
   on Windows), plus a private copy of Node.js if the computer doesn't have Node 20+.
2. Pulls the latest code from GitHub. If there's no internet, it keeps going with the copy
   it already has.
3. Installs dependencies and rebuilds, but only when something changed.
4. Turns on OBS's WebSocket server, gives it a password, and writes the same settings into
   `.env` so the app connects to OBS by itself. Then it starts OBS.
5. Starts the scoreboard, opens `/control` in the browser, and prints the address to use
   on phones and iPads. If the server crashes, it restarts it.

Keep the window open while you use the scoreboard. Close it (or press Ctrl+C) to stop.

**Install the launcher on the Desktop** (one time):

- **Windows:** open PowerShell and paste:
  ```
  iwr https://raw.githubusercontent.com/DryCreations/camp-scoreboard/main/launchers/CampScoreboard.bat -OutFile "$([Environment]::GetFolderPath('Desktop'))\CampScoreboard.bat"
  ```
- **Mac:** open Terminal and paste:
  ```
  curl -fsSL https://raw.githubusercontent.com/DryCreations/camp-scoreboard/main/launchers/CampScoreboard.command -o ~/Desktop/CampScoreboard.command && chmod +x ~/Desktop/CampScoreboard.command
  ```

Installing from the command line avoids the "downloaded from the internet" blocks. If you
download the file with a browser instead, Windows may show "Windows protected your PC"
(click **More info → Run anyway**). On a Mac, run `chmod +x` on the file, then right-click
it and choose **Open** the first time.

If you already have a copy of the repo, you can double-click `launchers/CampScoreboard.bat`
or `launchers/CampScoreboard.command` inside it, or run `npm run launch`.

Notes:

- Install [OBS Studio](https://obsproject.com) 28 or newer first. On Windows you can run
  `winget install -e --id OBSProject.OBSStudio`. Without OBS, everything except OBS
  control still works.
- OBS only reads its WebSocket settings when it starts. If OBS is already open with the
  WebSocket server turned off, close OBS and run the launcher again.
- After OBS connects, press **OBS Control → Create / Repair Managed Slot Scenes** on `/control` once to add the
  display browser sources to OBS. OBS saves them in its own scene collection.
- Options: `--no-update`, `--no-obs`, `--no-browser`. Environment variables:
  `CAMP_BRANCH` (default `main`), `CAMP_HOME` (install folder), and `CAMP_OBS_PATH` (OBS
  in an unusual location).
- With git installed, updates use `git pull`. Local edits to tracked data files, such as
  `data/assets.json`, are kept. Without git, the launcher downloads the code again and
  leaves files that already exist in `data/` untouched.

The sections below describe the manual setup the launcher does for you.

## Requirements

- [Node.js](https://nodejs.org) 20+ (LTS recommended). After installing, verify:
  ```
  node -v
  npm -v
  ```

## Install

```
npm install
```

## Run

### Development (with live reload) — used on Windows

```
npm run dev
```

Opens on http://localhost:5173.

### Production — used for deployment on macOS (also works on Windows)

```
npm run build
npm start
```

`npm start` runs `server.js`, which serves the app and Socket.io together on one port.
Use this mode at the camp.

## Port

The production port is read from `.env` as `PORT`. **The default is `3000`.** To change it,
copy `.env.example` to `.env` and set e.g. `PORT=8080`. (Development mode always uses 5173.)

## Connecting a second device (phone / iPad / display machine)

Other devices connect to **this machine's local IP**, not `localhost`. Both devices must be
on the same Wi-Fi / LAN.

Find this machine's local IP:

- **Windows:** run `ipconfig` in a terminal and read the `IPv4 Address` (e.g.
  `192.168.1.42`).
- **macOS:** **System Settings → Network** → select your active Wi-Fi/Ethernet → the IP is
  shown there. Or run `ifconfig | grep "inet "` and use the `192.168.x.x` / `10.x.x.x`
  address.

Then, from any device on the same network (using the production port `3000` — or `5173` in
dev):

- **Control panel:** `http://<your-local-ip>:3000/control`
- **A display:** `http://<your-local-ip>:3000/display/<id>`

The seeded display ids are `main` (scoreboard, 3840×2160), `clock` (1920×1080), and `score`
(1920×1080).

> If other devices can't connect, allow the app through the firewall (Windows prompts the
> first time; on macOS allow incoming connections for Node).

## Two views: Control and Settings

The phone/iPad UI is split into two pages, with tabs at the top to switch between them:

- **`/control`** — the live board remote you use during a game: **Score**, **Game Clock**,
  **Shot Clock**, **Team Fouls**, **Overlay**, **Ticker**, **Banners**, **Triggers**,
  **Soundboard**, and **OBS Control**.
- **`/settings`** — set-once configuration: **Branding** (team names, colors, gradient,
  logos), **Banners** (size and colors), **Sounds**, **Game Rules** (shot-clock duration, foul bonus threshold), and the
  **Displays** manager.

Notes:

- **Game clock & shot clock** are independent — each has its own start / stop / reset.
- **Overlay** shows a full-screen banner (Timeout / Halftime / custom text) over every
  display until you hit Hide. No timers or game logic attached — it's a simple on/off.
- **Ticker** is a persistent news-broadcast crawl along the bottom of every display. Type a
  message, hit **Show**; **Hide** removes it.
- **Banners** are fixed messages across the top and/or bottom of every display (a welcome
  line, a sponsor, "Go Lions!"). Type the text on `/control` → **Banners** and hit **Show**;
  it stays up until **Hide**, and survives restarts. Text size and colors are on
  `/settings` → **Banners**. A banner takes real space: the scoreboard shrinks to fit between
  them, long text shrinks to one line, and the ticker sits just above the bottom banner.
- **Triggers** are momentary: buzzer, confetti, and shot-clock violation each play a
  flash/sound for a moment and clear themselves. The game clock and shot clock hitting zero
  fire the buzzer and shot-clock triggers automatically (both use the buzzer sound).

## Sounds

The **Soundboard** on `/control` plays audio files out loud on every display (so OBS /
gym speakers pick them up). Sounds are just files in `data/sounds/`:

1. Drop `.wav` / `.mp3` / `.ogg` files into `data/sounds/`.
2. Optionally give them friendly names in `data/sounds/sounds.json`
   (`{ "buzzer.wav": "Buzzer" }`). Files not listed there use their filename.
3. On `/control` → **Soundboard** (or `/settings` → **Sounds**) tap **Refresh / Rescan** to
   pick up new files.

On `/settings` → **Sounds** you can preview each file and choose which sound each trigger
plays (e.g. the buzzer / confetti). Browsers only allow audio after a first tap, so tap
anything on a display page once to enable sound; OBS Browser Sources play audio automatically.

## Displays

Three displays ship out of the box (`main`, `clock`, `score`), all reading the same live
state. Change anything on `/control` and every display updates instantly, no reload.

### Add a new display (no code changes)

1. `/settings` → **Displays** → **Add display**.
2. Set a name, pick a **type** (`scoreboard`, `clock`, or `score`), set the **resolution**.
3. Press **Add**. It works immediately at its own `/display/<id>` URL.

Each display row has **Copy URL** and **Pop out** (opens a window sized to the display's
exact resolution).

## Uploading a team logo

1. `/settings` → **Branding** → **Home logo** / **Away logo** → **Upload image**.
2. Pick a file (works from a phone's camera roll / file picker). It uploads to the server
   (`data/uploads/`) and appears immediately on every display.
3. Alternatively, paste an absolute path to an image that already lives **on the server
   machine**, or an image URL, into the field below the upload button.

## Feeding displays into OBS / Novastar

- **OBS Browser Source (recommended).** Add the display's URL (from **Copy URL**) as a
  Browser Source and set that source's **Width/Height in OBS** to the display's target
  resolution. OBS renders it off-screen via CEF at that resolution regardless of your
  monitor size.
- **Pop-out window (fallback).** Use **Pop out** for non-OBS capture paths (e.g. a Novastar
  processor via window/display capture).

## OBS setup (optional)

OBS is expected to run on the **same machine** as this server, so it connects over
`127.0.0.1`.

1. In OBS: **Tools → WebSocket Server Settings** → enable the server. Note the **port
   (default 4455)** and set/copy the password.
2. Copy `.env.example` to `.env` and fill in:
   ```
   OBS_HOST=127.0.0.1
   OBS_PORT=4455
   OBS_PASSWORD=your-password
   ```
3. Restart the app. It connects on startup and retries automatically if OBS isn't running.

With OBS connected, `/control` → **OBS Control** lists OBS's real scenes and sources (never
hand-typed): tap a scene to switch live, tap a source to toggle its visibility. If OBS
isn't reachable, the section shows a clear "Not connected" state and the rest of the app is
unaffected. Triggers can also switch scenes automatically — configure that per trigger in
`data/config.json`.

## Config & persistence

- `data/config.json` holds settings (shot-clock duration, bonus threshold), theme/branding,
  the display registry, and trigger definitions (including each trigger's sound). Loaded on
  boot, saved on every edit.
- `data/sounds/` holds soundboard audio files, with optional friendly names in
  `data/sounds/sounds.json`. `data/uploads/` holds uploaded logos.
- Score, fouls, both clocks, the overlay, and the ticker are in-memory and reset when the
  server restarts.
