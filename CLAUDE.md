# Notes for coding agents

This repo is a sideloaded home-screen app for Samsung Tizen TVs (see README.md). Someone has
probably cloned it and asked you to put it on their TV, adapt it, or build something like it.
These notes are what the original build learned the hard way.

## Ground rules

- **Work in the browser preview first.** `python3 -m http.server 8080` in the repo root, then
  open it. `js/mock.js` fakes the Tizen APIs, so layout, focus and settings are real. Check every
  visual change there before touching the TV.
- **Personal settings never go in tracked files.** The TV's IP, signing profile, HDMI devices,
  shortcuts and personal photos belong in `tv.env`, `js/config.local.js` and
  `img/wallpapers/local/`, all gitignored. `js/config.js` holds only generic defaults.
- **Don't modify the TV itself.** No root, no undocumented `vconf` or preference edits, no
  rewiring the Home button or power-on behaviour. A sideloaded app that can be uninstalled is the
  whole contract. For start-on-power-on, point the user to Autorun Last App (see below).
- **Never install apps for unlicensed streaming** (pirated live TV or sport). Offer the official
  broadcaster apps instead.

## Getting onto the user's TV

You can only do this from a machine on the same network as the TV. Ask the user for:

1. The **TV's IP**: Settings → General → Network → Network Status → IP Settings.
2. **Developer Mode on**, with **Host PC IP** set to *this computer's* IP: Apps → type
   `1 2 3 4 5` → On → Host PC IP → restart the TV by holding power. Give them this computer's IP
   (`ipconfig getifaddr en0` on macOS).

Then:

```sh
nc -z -G 3 <TV_IP> 26101 && echo ok   # SDB port should be open
tools/setup-tizen.sh                  # once: Tizen tools into ~/tizen-studio, cert + profile
cp tv.env.example tv.env              # set TV_IP
cp js/config.local.example.js js/config.local.js
./deploy.sh
```

Useful checks:

- `curl -s http://<TV_IP>:8001/api/v2/` returns JSON whose `device.developerIP` is the current
  Host PC IP. Check it before deploying: if it's `127.0.0.1`, deploys will fail (see TizenBrew).
- After the TV restarts, sdb often holds a dead connection: `sdb kill-server`, then reconnect.
  `deploy.sh` does this itself.
- There's no shell on retail TVs (`sdb shell` only accepts a few Samsung `0 …` commands) and no
  root. `sdb shell 0 applist` lists installed app ids.
- Samsung's TVs speak SDB, not ADB. If the user says "ADB", they mean this.

## Seeing what the TV does

You can't screenshot the TV or attach a debugger. Use the dev log instead: run
`python3 tools/devlog.py`, set `devLogUrl: 'http://<this computer IP>:8790/log'` in
`js/config.local.js`, deploy, then read `logs/tv.jsonl`. `Devlog.log(event, data)` works anywhere
in the app. Turn it back off (`null`) and redeploy when done. For anything visual, ask the user
for a photo or a short video of the screen. Frames can be pulled out of a video with
AVFoundation in a small Swift script.

## The TV's engine

Tested on a 2020 TU7100: Tizen 5.5, **Chromium 69**, weak GPU. Newer TVs are more capable, but
keep to the lowest common denominator:

- No flex `gap`, `inset`, `aspect-ratio`, `:has()`, container queries, optional chaining (`?.`)
  or `??`. Write ES2015-level JavaScript.
- Animate only `transform` and `opacity`. No live radial gradients or `backdrop-filter` blur:
  bake them into wallpaper JPEGs (`tools/wallpapers.swift` does this). Static `box-shadow` and
  `text-shadow` are fine.
- No colour emoji font: use inline SVG icons.
- Remote keys: arrows 37–40, OK 13, Back 10009, colour keys 403–406, digits 48–57. Colour and
  number keys must be registered with `tizen.tvinputdevice.registerKey`.

## Things that were tried and how they turned out

- **Signing:** a local Tizen author certificate (made by `setup-tizen.sh`) installs fine on a
  Developer Mode TV. A Samsung certificate wasn't needed.
- **HDMI switching:** `tizen.tvwindow.setSource()` needs a source object from
  `tizen.systeminfo.getPropertyValue('VIDEOSOURCE')`, not a hand-made `{type, number}`. Samsung's
  `org.tizen.tv-viewer` then ignored the new source on this TV, so the default is to show the
  input inside the app with `tizen.tvwindow.show()` (see `js/inputs.js`).
- **Start on power-on:** an `on-boot="true"` web service installs and runs when started by hand,
  but this TV never started it at boot. Don't re-add it; use **Autorun Last App**.
- **TizenBrew / TizenTube:** TizenBrew only works with Host PC IP `127.0.0.1`, which blocks
  deploys from a computer. Tell the user to switch the IP before deploying and back afterwards.
  Its autolaunch was broken by a stale-socket bug; `tools/patch-tizenbrew.sh` fixes it. A
  launcher tile opens a module directly with an app-control request (`brands[...].module` in
  `js/config.js`, `Apps.launch` in `js/apps.js`).
- **Store apps** can't be uninstalled over SDB, only apps that were sideloaded.

## Code map

`js/main.js` holds screens, focus and keys; `js/apps.js` listing and launching; `js/inputs.js`
HDMI; `js/screensaver.js`; `js/weather.js` (Open-Meteo, cached); `js/prefs.js` (localStorage
settings, which win over config after the first run); `css/style.css` (1920×1080 stage). Match
the existing style: small modules exposing one global, comments that explain *why*.
