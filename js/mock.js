// Stand-in Tizen APIs so the launcher runs in a desktop browser. Does nothing on the TV,
// where `tizen` already exists.
(function () {
    if (typeof tizen !== 'undefined') return;

    var APPS = [
        ['xvvl3S1bvH.TizenBrewStandalone', 'TizenBrewNextGeneration'],
        ['NuvioTV001.NuvioTV', 'Nuvio TV'],
        ['NuvioTV001.EngineFsService', 'Nuvio EngineFS Service'],
        ['org.tizen.netflix-app', 'Netflix'],
        ['rJeHak5zRg.Spotify', 'Spotify - Music and Podcasts'],
        ['IkWsFHtOY9.Stremio', 'Stremio'],
        ['9Ur5IzDKqV.TizenYouTube', 'YouTube'],
        ['com.samsung.tv.knox-browser', 'Internet'],
        ['HeLLoTV001.HelloTV', 'Hello TV'],
        ['com.samsung.tv.store', 'Apps'],
        ['org.tizen.tv-viewer', 'tv-viewer'],
        ['com.samsung.tv.adagent-service', 'adagent-service']
    ];

    function log(msg) {
        if (window.console) console.log('[mock] ' + msg);
    }

    window.tizen = {
        mock: true,
        application: {
            getAppsInfo: function (ok) {
                setTimeout(function () {
                    ok(APPS.map(function (a) { return { id: a[0], name: a[1], iconPath: '', show: true }; }));
                }, 50);
            },
            getCurrentApplication: function () {
                return { appInfo: { id: 'MinLaunch1.Home' }, exit: function () { log('exit'); } };
            },
            launch: function (id) { log('launch ' + id); },
            launchAppControl: function (control, id) { log('launchAppControl ' + id); }
        },
        ApplicationControl: function () {},
        ApplicationControlData: function () {},
        systeminfo: {
            getPropertyValue: function (prop, ok) {
                ok({
                    // Add ?ps5 to the preview URL to pretend something is plugged into HDMI 2
                    connected: [{ type: 'HDMI', number: 1 }].concat(/ps5/.test(location.search) ? [{ type: 'HDMI', number: 2 }] : []),
                    disconnected: /ps5/.test(location.search) ? [] : [{ type: 'HDMI', number: 2 }]
                });
            }
        },
        tvwindow: {
            setSource: function (src, ok) { log('setSource HDMI ' + src.number); ok(); },
            show: function (ok) { log('tvwindow.show'); ok(); },
            hide: function (ok) { log('tvwindow.hide'); ok(); }
        },
        tvinputdevice: { registerKey: function () {} },
        time: {
            getLocalTimezone: function () {
                try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'Europe/London'; }
            }
        }
    };
})();
