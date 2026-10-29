# Home: a quieter launcher for Samsung TVs

A home screen for Samsung Tizen TVs, in place of Samsung's ad-filled one: a big clock with the
weather, a row of your apps, a row of your HDMI devices, and nothing else. It runs as a normal
sideloaded app; no root, nothing on the TV is modified.

- **Clock and weather:** time-of-day greeting, a thin clock, the date, and the current weather
  from [Open-Meteo](https://open-meteo.com/) (no account or key).
- **Apps row:** your apps as branded tiles, in the order you like. Yellow on a tile moves or
  removes it; **+** adds one from All apps.
- **Devices row:** HDMI inputs (Fire TV, consoles…) with a live/no-signal dot, plus apps such as
  Samsung TV Plus. A console tile can stay hidden until it's switched on.
- **Number-key shortcuts:** 1–9 open whatever you assign in Settings.
- **Wallpapers and screen saver:** built-in wallpapers, or your own photos. After a few idle
  minutes the screen saver pans slowly through them, moving everything to avoid burn-in.
- **Ad-free YouTube:** opens TizenTube directly, through TizenBrew (see below).

Built for and tested on a **Samsung UE55TU7100 (2020, Tizen 5.5, Chromium 69)**. Other Tizen TVs
should work, but nothing else has been tested. Inspired by a friend's Arn0 Launcher; this is a
separate implementation.

## Try it in a browser first

No TV needed. In this folder:

```sh
python3 -m http.server 8080
```

Open <http://localhost:8080> and use the arrow keys and Enter. Esc or Backspace is Back, and
R G Y B are the remote's colour keys. [`js/mock.js`](js/mock.js) stands in for the TV's APIs, so
layout, focus and settings are real, but opening apps and switching inputs only log to the
console. Add `?ps5` to the URL to pretend a console is plugged into HDMI 2.

## Put it on your TV

You need a Mac or Linux computer on the same network as the TV.

1. **Turn on Developer Mode on the TV.** Open **Apps**, type `1 2 3 4 5` on the remote (press
   **123** if your remote has no number buttons), switch Developer Mode **On**, and set
   **Host PC IP** to your computer's IP address. Restart the TV by holding the power button.
2. **Install the Tizen tools** (once, no sudo, about 270 MB):
   ```sh
   tools/setup-tizen.sh
   ```
   This unpacks Samsung's command-line tools into `~/tizen-studio` and creates a local signing
   certificate. Developer Mode TVs accept it, so you don't need a Samsung account.
3. **Tell it about your TV:**
   ```sh
   cp tv.env.example tv.env                          # set TV_IP
   cp js/config.local.example.js js/config.local.js  # your devices and shortcuts
   ```
4. **Install:**
   ```sh
   ./deploy.sh
   ```
   It packages, signs, installs and opens the launcher (about 5 seconds). Run it again after
   every change.

To have the TV open the launcher when it's switched on, turn on **Settings → General → Smart
Features → Autorun Last App** and leave the launcher open when you switch off. Turn off
**Autorun Smart Hub** too. (A start-at-boot service was tried: Tizen accepts it, but this TV
never runs it at power-on, so it isn't included.)

## Ad-free YouTube (TizenTube)

[TizenTube](https://github.com/reisxd/TizenTube) is a module for
[TizenBrew](https://github.com/reisxd/TizenBrew). Download a TizenBrew `.wgt` from its releases,
then patch, sign and install it:

```sh
tools/patch-tizenbrew.sh ~/Downloads/TizenBrewStandalone.wgt --install
```

The patch fixes a bug where TizenBrew restarts itself in debug mode and then loses the "open
TizenTube" message, landing on its menu instead. That broke both TizenBrew's own Autolaunch
setting and the launcher's YouTube tile; [`tools/patch-tizenbrew.py`](tools/patch-tizenbrew.py)
explains the details. If a newer TizenBrew has changed that code, the tool says so.

**The catch:** TizenBrew only works when Developer Mode's **Host PC IP is `127.0.0.1`**, but
installing from your computer needs it set to **your computer's IP**. Switch to your computer's
IP (and restart the TV) when you want to deploy, then back to `127.0.0.1` afterwards. Apps that
are already installed keep working either way.

## Remote

| Key | On Home |
| --- | --- |
| Arrows, OK | move, open (Up from the apps row reaches the ⚙️ gear for Settings) |
| 1–9 | number-key shortcuts |
| Red | All apps (OK on an app: open, add to Home or remove) |
| Green | next wallpaper |
| Yellow | on an app tile: move left or right, or remove |
| Back | nothing on Home; one step back elsewhere; leaves a device you're watching |

## Customising

Defaults are in [`js/config.js`](js/config.js). Put your own TV's settings in
`js/config.local.js` (gitignored): each key you set there replaces the same key in `config.js`.
Most things can also be changed from Settings on the TV, and the TV's saved choice wins after
that.

- **Apps:** `homeApps` sets the first-run row, and `brands` sets each app's name, tile colour and
  logo or wordmark. To find an app's id, open All apps (Red): the focused app's id is shown at
  the bottom.
- **Devices:** HDMI entries have a `port`; set the real one in **Settings** on the TV.
  `whenConnected: true` hides a tile until the TV sees a picture on that port. An `app` entry
  (like TV Plus) opens an app instead.
- **Wallpapers:** turn your photos into wallpapers with the readability darkening baked in:
  ```sh
  swift tools/wallpapers.swift img/wallpapers/local ~/Pictures/tv   # macOS
  ```
  Then list them in `config.local.js` (the example shows how). Run it with just the output folder
  to regenerate the built-in abstract set.
- **Look:** [`css/style.css`](css/style.css). Read its header first.

### What this TV can afford

The TU7100 has a weak GPU and an old browser engine, and these rules come from what worked on it:

- **Animate only `transform` and `opacity`.** Live radial gradients and blur are far too slow;
  gradients are baked into the wallpaper JPEGs instead.
- **Chromium 69:** no flex `gap`, `inset`, `aspect-ratio`, `:has()` or optional chaining.
- **Pan, don't zoom:** the screen saver pans its photo rather than slowly scaling it.

## HDMI devices: what was learned

- `tizen.tvwindow.setSource()` only accepts the TV's own source objects from
  `tizen.systeminfo.getPropertyValue('VIDEOSOURCE')`, not a hand-made `{type, number}`.
- On this TV, Samsung's TV viewer (`org.tizen.tv-viewer`) ignores the newly set source and shows
  its last one. So by default the launcher shows the input full screen itself with
  `tizen.tvwindow.show()`; Back returns to Home. Use the device's own remote to control it.
  **Settings → Open devices** switches back to Samsung's viewer.
- A home theater on the **ARC** port reports no picture, since the TV sends sound *to* it.

## Debugging on the TV

The TV gives you no console, so the launcher can send its log to your computer:

```sh
python3 tools/devlog.py        # listens on port 8790, writes logs/tv.jsonl
```

Set `devLogUrl: 'http://<your computer IP>:8790/log'` in `config.local.js` and redeploy. Set it
back to `null` when you're done.

## Files

```
index.html, config.xml, icon.png   the app and its Tizen manifest
css/style.css                      the whole look (1920x1080 stage)
js/config.js                       defaults; js/config.local.js = your TV (gitignored)
js/main.js                         screens, focus, remote keys, Settings
js/apps.js                         app list, filtering, launching (incl. TizenBrew modules)
js/inputs.js                       HDMI devices: ports, signal, switching, in-launcher view
js/weather.js                      Open-Meteo, cached; js/screensaver.js idle screen saver
js/prefs.js                        settings saved on the TV; js/devlog.js debug log
js/mock.js                         fake Tizen APIs for the browser preview
fonts/                             Manrope (OFL), bundled so nothing loads at runtime
img/marks/                         brand logos (Simple Icons, CC0); img/wallpapers/ built-ins
tools/                             setup-tizen.sh, patch-tizenbrew.sh, wallpapers.swift, devlog.py
deploy.sh, tv.env.example          build, sign and install
```

## Limits

- Samsung's **Home** button still opens Samsung's home bar, and its Netflix/Prime buttons can't
  be remapped: those are locked without root.
- Number-key shortcuts work while the launcher is on screen, not inside other apps.
- Settings are stored on the TV and survive updates, not an uninstall.

## Credits

Fonts: [Manrope](https://github.com/sharanda/manrope), SIL Open Font License. Logos:
[Simple Icons](https://simpleicons.org/), CC0; brand names and logos belong to their owners.
Weather: [Open-Meteo](https://open-meteo.com/). Ad-free YouTube:
[TizenBrew and TizenTube](https://github.com/reisxd/TizenBrew). Not affiliated with Samsung or
any of these services.
