// Current weather from Open-Meteo (no API key). Cached so Home and the screen saver show a
// reading straight away; refreshed at most hourly; anything over three hours old counts as
// no reading, so an unattended screen never shows yesterday's temperature as today's.
var Weather = (function () {
    var KEY = 'minlaunch.weather';
    var PLACE_KEY = 'minlaunch.place';
    var HOUR = 3600000;
    var loading = false;

    // Line icons as SVG: the TV has no colour emoji font
    var SUN = '<circle cx="32" cy="32" r="11" fill="#fff" stroke="none"/>' +
        '<path d="M32 8v7M32 49v7M8 32h7M49 32h7M15 15l5 5M44 44l5 5M15 49l5-5M44 20l5-5" stroke="#fff"/>';
    var MOON = '<path d="M42 40a16 16 0 0 1-18-24 16 16 0 1 0 18 24z" fill="#fff" stroke="none"/>';
    var CLOUD = '<path d="M20 46h26a10 10 0 0 0 0-20 14 14 0 0 0-27 3 9 9 0 0 0 1 17z" fill="#fff" stroke="none"/>';
    var ICONS = {
        clear: SUN,
        night: MOON,
        partly: '<g transform="translate(-6 -8) scale(.8)">' + SUN + '</g>' + CLOUD,
        cloud: CLOUD,
        fog: '<path d="M12 26h40M8 34h48M14 42h36" stroke="#fff"/>',
        rain: CLOUD + '<path d="M24 50l-3 8M33 50l-3 8M42 50l-3 8" stroke="#fff"/>',
        snow: CLOUD + '<path d="M24 54h.1M33 56h.1M42 54h.1" stroke="#fff" stroke-width="6"/>',
        storm: CLOUD + '<path d="M34 46l-6 9h7l-5 9" stroke="#fff"/>'
    };

    function svg(name) {
        return '<svg viewBox="0 0 64 64" fill="none" stroke-width="4" stroke-linecap="round">' + (ICONS[name] || CLOUD) + '</svg>';
    }

    // WMO weather codes -> [icon, description]
    function describe(code, isDay) {
        if (code === 0) return [isDay ? 'clear' : 'night', 'Clear'];
        if (code <= 2) return [isDay ? 'partly' : 'cloud', 'Partly cloudy'];
        if (code === 3) return ['cloud', 'Overcast'];
        if (code <= 48) return ['fog', 'Fog'];
        if (code <= 67) return ['rain', code <= 57 ? 'Drizzle' : 'Rain'];
        if (code <= 77) return ['snow', 'Snow'];
        if (code <= 82) return ['rain', 'Showers'];
        if (code <= 86) return ['snow', 'Snow showers'];
        return ['storm', 'Thunderstorm'];
    }

    function getJSON(url, done) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.timeout = 10000;
        xhr.onload = function () {
            var r = null;
            try { r = JSON.parse(xhr.responseText); } catch (e) {}
            done(r);
        };
        xhr.onerror = xhr.ontimeout = function () { done(null); };
        xhr.send();
    }

    function read(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    }

    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }

    function cityFromTimezone() {
        var tz = '';
        try { tz = tizen.time.getLocalTimezone(); } catch (e) {}
        var parts = (tz || 'Europe/London').split('/');
        return parts[parts.length - 1].replace(/_/g, ' ');
    }

    function locate(done) {
        var w = CONFIG.weather;
        if (w.latitude != null && w.longitude != null) {
            return done({ latitude: w.latitude, longitude: w.longitude, name: w.city || '' });
        }
        var query = w.city || cityFromTimezone();
        var saved = read(PLACE_KEY);
        if (saved && saved.query === query) return done(saved);
        getJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&name=' + encodeURIComponent(query), function (r) {
            if (!r || !r.results || !r.results.length) return done(null);
            var p = { query: query, latitude: r.results[0].latitude, longitude: r.results[0].longitude, name: r.results[0].name };
            write(PLACE_KEY, p);
            done(p);
        });
    }

    function current() {
        var c = read(KEY);
        return c && Date.now() - c.at < 3 * HOUR ? c : null;
    }

    function refresh(done) {
        var c = current();
        if (c && Date.now() - c.at < HOUR) return done && done(c);
        if (loading) return;
        loading = true;
        locate(function (p) {
            if (!p) {
                loading = false;
                return done && done(current());
            }
            getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + p.latitude + '&longitude=' + p.longitude +
                '&current=temperature_2m,weather_code,is_day&timezone=auto', function (r) {
                loading = false;
                if (!r || !r.current) return done && done(current());
                var d = describe(r.current.weather_code, r.current.is_day === 1);
                var reading = { at: Date.now(), temp: Math.round(r.current.temperature_2m), icon: d[0], desc: d[1], place: p.name };
                write(KEY, reading);
                if (done) done(reading);
            });
        });
    }

    return { current: current, refresh: refresh, svg: svg };
})();
