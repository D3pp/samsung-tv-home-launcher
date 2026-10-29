// Your own TV's settings. Copy this file to js/config.local.js (gitignored) and edit it.
// Each key here replaces the same key in js/config.js; anything you leave out keeps the
// default. It's loaded by the browser preview and packaged into the .wgt by deploy.sh.
(function () {
    var local = {
        // Your HDMI devices, plus any apps you want on the Devices row
        devices: [
            { id: 'firetv', name: 'Fire TV Stick', port: 1, color: '#b8430d', color2: '#f27d1f', text: 'fire tv' },
            { id: 'ps5', name: 'PlayStation 5', port: 2, color: '#00379e', color2: '#0070d1',
                mark: 'img/marks/playstation.svg', whenConnected: true },
            { id: 'tvplus', name: 'TV Plus', app: 'com.samsung.tv.tvPlusDeeplinker', subtitle: 'Samsung · Free live TV',
                color: '#0e2a5c', color2: '#1f5bd6', text: 'TV+' }
        ],

        shortcuts: {
            1: 'app:xvvl3S1bvH.TizenBrewStandalone',
            2: 'app:org.tizen.netflix-app',
            3: 'device:firetv'
        },

        // Your own photos, after running:
        //   swift tools/wallpapers.swift img/wallpapers/local ~/Pictures/tv
        // wallpapers: CONFIG.wallpapers.concat([
        //     { file: 'img/wallpapers/local/beach.jpg', name: 'Beach' }
        // ]),

        // Set if the weather picks the wrong place
        // weather: { city: 'Manchester', latitude: null, longitude: null },

        // devLogUrl: 'http://192.168.1.20:8790/log',
    };
    for (var k in local) CONFIG[k] = local[k];
})();
