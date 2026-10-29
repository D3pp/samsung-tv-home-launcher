// Settings saved on the TV. They survive restarts and in-place updates, not an uninstall.
var Prefs = (function () {
    var KEY = 'minlaunch.prefs';
    var DEFAULTS = {
        background: 0,          // 'off', 'rotate', or a wallpaper index
        wallpaper: 0,           // current wallpaper while rotating
        rotateEvery: 'home',    // 'home' (each time Home opens) or minutes
        rotatedAt: 0,
        clock24: true,
        showDate: true,
        appNames: 'always',     // 'focus', 'always', 'never'
        saverAfter: 5,          // minutes idle on Home; 0 = off
        darkAfter: 60,          // minutes of screen saver before going black; 0 = never
        homeApps: null,         // null = CONFIG.homeApps
        devicePorts: null,      // { deviceId: port }; null = the ports in CONFIG.devices
        inputMethod: 'inapp',   // 'inapp' (full screen in the launcher) or 'viewer' (Samsung's TV viewer)
        shortcuts: null,        // { '1': 'app:<id>' | 'device:<id>' | '' }; null = CONFIG.shortcuts
        portsVersion: 0         // bumped when CONFIG.devices ports change, to drop stale choices
    };

    var data = {};
    try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}

    function get(k) {
        return data.hasOwnProperty(k) ? data[k] : DEFAULTS[k];
    }

    function set(k, v) {
        data[k] = v;
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    }

    function reset() {
        data = {};
        try { localStorage.removeItem(KEY); } catch (e) {}
    }

    return { get: get, set: set, reset: reset };
})();
