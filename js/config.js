// Defaults for the launcher. Most of this can be changed from Settings on the TV, and the
// TV's own saved copy wins after the first run.
//
// Anything specific to your own TV (your HDMI devices, shortcuts, personal wallpapers) belongs
// in js/config.local.js instead: it is gitignored and applied over this file. Copy
// js/config.local.example.js to start.
var CONFIG = {
    // Apps on Home the first time it runs. Apps that aren't installed are skipped.
    // Afterwards: Yellow on a tile to move or remove it, or + at the end of the row.
    homeApps: [
        'xvvl3S1bvH.TizenBrewStandalone',
        'NuvioTV001.NuvioTV',
        'rJeHak5zRg.Spotify',
        'org.tizen.netflix-app',
        'IkWsFHtOY9.Stremio',
        'com.samsung.tv.knox-browser'
    ],

    // Number keys 1-9 on Home: 'app:<app id>' or 'device:<device id>'. Change them in
    // Settings → Number-key shortcuts; the TV's saved choice wins after that.
    shortcuts: {
        1: 'app:xvvl3S1bvH.TizenBrewStandalone',
        2: 'app:org.tizen.netflix-app',
        3: 'device:hdmi1'
    },

    // Per app id: display name, tile colour, and a brand mark (img/marks) or a text wordmark.
    // Apps not listed use the TV's own name and icon on a neutral tile.
    brands: {
        // TizenBrew, opened straight into its TizenTube module (ad-free YouTube)
        'xvvl3S1bvH.TizenBrewStandalone': {
            name: 'YouTube', color: '#e62117', mark: 'img/marks/youtube.svg',
            module: { moduleType: 'npm', moduleName: '@foxreis/tizentube', args: '' }
        },
        // Samsung's own YouTube app, with ads
        '9Ur5IzDKqV.TizenYouTube': { name: 'YouTube (with ads)', color: '#5a1410', mark: 'img/marks/youtube.svg' },
        'NuvioTV001.NuvioTV': { name: 'Nuvio', color: '#4b32b8', text: 'nuvio' },
        'rJeHak5zRg.Spotify': { name: 'Spotify', color: '#141414', mark: 'img/marks/spotify.svg' },
        'org.tizen.netflix-app': { name: 'Netflix', color: '#141414', mark: 'img/marks/netflix.svg' },
        'IkWsFHtOY9.Stremio': { name: 'Stremio', color: '#2d2266', mark: 'img/marks/stremio.svg' },
        'com.samsung.tv.knox-browser': { name: 'Internet', color: '#1f56c9', mark: 'img/marks/globe.svg' }
    },

    // The Devices row. HDMI entries switch the TV to that port; `port` is only the starting
    // value, the real one can be set in Settings on the TV. `color2` makes the tile a gradient.
    // `whenConnected` hides the tile until the TV sees a picture on its port. An `app` entry
    // opens that app instead of an HDMI port.
    devices: [
        { id: 'hdmi1', name: 'HDMI 1', port: 1, color: '#26272e', color2: '#3a3c46', text: '1' },
        { id: 'hdmi2', name: 'HDMI 2', port: 2, color: '#26272e', color2: '#3a3c46', text: '2', whenConnected: true },
        { id: 'tvplus', name: 'TV Plus', app: 'com.samsung.tv.tvPlusDeeplinker', subtitle: 'Samsung · Free live TV',
            color: '#0e2a5c', color2: '#1f5bd6', text: 'TV+' }
    ],
    // Raise this when changing device ports, so saved choices from Settings are reset once
    portsVersion: 1,
    // Port choices in Settings when the TV doesn't report its own list
    ports: [1, 2, 3, 4],

    // While debugging, run `python3 tools/devlog.py` on your computer and set this (in
    // config.local.js) to 'http://<computer IP>:8790/log' to receive the TV's log. null = off.
    devLogUrl: null,

    // Preinstalled apps worth showing in All apps (store apps are detected by their id)
    consumerApps: [
        'org.tizen.netflix-app', 'com.samsung.tv.knox-browser', 'com.samsung.tv.store',
        'org.tizen.tv-viewer', 'com.samsung.tv.mycontents'
    ],

    tvViewer: 'org.tizen.tv-viewer',
    samsungHome: 'com.samsung.tv.csfs',

    // Made by tools/wallpapers.swift, which bakes in the darkening behind the clock and tiles.
    // Put your own photos in img/wallpapers/local/ (gitignored) and list them in config.local.js.
    wallpapers: [
        { file: 'img/wallpapers/milky-way.jpg', name: 'Milky Way' },
        { file: 'img/wallpapers/dusk.jpg', name: 'Dusk' },
        { file: 'img/wallpapers/deep-sea.jpg', name: 'Deep Sea' },
        { file: 'img/wallpapers/aurora.jpg', name: 'Aurora' },
        { file: 'img/wallpapers/ember.jpg', name: 'Ember' },
        { file: 'img/wallpapers/graphite.jpg', name: 'Graphite' }
    ],

    // Leave latitude/longitude null to find the city from the TV's time zone
    weather: { city: null, latitude: null, longitude: null }
};
