// Idle screen saver on Home: wallpapers full screen with the clock, weather and photo name in
// the corners. Everything drifts to avoid burn-in, and it fades to black after a while.
// Only transform and opacity animate, and the photo pans rather than zooms: a slow scale()
// gets re-rasterised in visible steps on Samsung's engine, a translate() stays smooth.
var Saver = (function () {
    var PHOTO_SECONDS = 75;
    var CORNER_SECONDS = 150;
    var CORNERS = ['tl', 'tr', 'br', 'bl'];

    var canShow = function () { return false; };
    var active = false;
    var idleTimer, photoTimer, cornerTimer, darkTimer;
    var photo = 0, direction = 1, corner = 0;

    function $(id) {
        return document.getElementById(id);
    }

    function init(canShowFn) {
        canShow = canShowFn;
    }

    function arm() {
        clearTimeout(idleTimer);
        var minutes = Prefs.get('saverAfter');
        if (!minutes || active) return;
        idleTimer = setTimeout(function () {
            if (canShow()) show();
        }, minutes * 60000);
    }

    function disarm() {
        clearTimeout(idleTimer);
        if (active) hide(false);
    }

    function show() {
        active = true;
        var bg = Prefs.get('background');
        photo = bg === 'rotate' ? Prefs.get('wallpaper') : (typeof bg === 'number' ? bg : 0);
        corner = Math.floor(Math.random() * 4);
        $('saver').className = 'on';
        $('s-black').className = '';
        placeCorners();
        showPhoto(true);
        updateWeather(Weather.current());
        Weather.refresh(updateWeather);

        cornerTimer = setInterval(function () {
            corner = (corner + 1) % 4;
            placeCorners();
        }, CORNER_SECONDS * 1000);

        var dark = Prefs.get('darkAfter');
        if (dark) {
            // A web app can't switch the panel off, so black is the best it can do; the TV's
            // own Auto Power Off handles the rest
            darkTimer = setTimeout(function () { $('s-black').className = 'on'; }, dark * 60000);
        }
    }

    function hide(rearm) {
        active = false;
        clearTimeout(photoTimer);
        clearInterval(cornerTimer);
        clearTimeout(darkTimer);
        $('saver').className = '';
        if (rearm !== false) arm();
    }

    function showPhoto(first) {
        var layer = $('s-photo');
        var bg = Prefs.get('background');
        var n = CONFIG.wallpapers.length;

        if (bg === 'off' || !n) {
            layer.style.display = 'none';
            $('s-name').textContent = '';
            return;
        }
        layer.style.display = '';
        if (!first && bg === 'rotate') photo = (photo + 1) % n;

        var swap = function () {
            var w = CONFIG.wallpapers[photo % n];
            layer.onload = function () {
                // Jump to one end without animating, then pan to the other end over the photo's time
                layer.style.transition = 'none';
                layer.style.transform = direction > 0 ? 'translate(0,0)' : 'translate(-320px,-180px)';
                layer.offsetWidth;
                layer.style.transition = 'transform ' + PHOTO_SECONDS + 's linear, opacity 1s';
                layer.style.transform = direction > 0 ? 'translate(-320px,-180px)' : 'translate(0,0)';
                layer.style.opacity = 1;
                direction = -direction;
            };
            layer.src = w.file;
            $('s-name').textContent = w.name;
            nudgeCorners();
        };

        if (first) {
            swap();
        } else {
            layer.style.opacity = 0;
            setTimeout(swap, 1000);
        }
        photoTimer = setTimeout(function () { showPhoto(false); }, PHOTO_SECONDS * 1000);
    }

    // Clock in one corner, photo name and weather in the next two, rotating every few minutes
    function placeCorners() {
        $('s-clock').className = 'corner big ' + CORNERS[corner];
        $('s-name').className = 'corner ' + CORNERS[(corner + 1) % 4];
        $('s-weather').className = 'corner ' + CORNERS[(corner + 2) % 4];
        nudgeCorners();
    }

    // A few pixels of movement on each photo, so nothing sits on exactly the same pixels
    function nudgeCorners() {
        ['s-clock', 's-name', 's-weather'].forEach(function (id) {
            var dx = Math.round(Math.random() * 24 - 12);
            var dy = Math.round(Math.random() * 16 - 8);
            $(id).style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        });
    }

    function updateWeather(c) {
        $('s-weather').innerHTML = c ? Weather.svg(c.icon) + '<span>' + c.temp + '°&nbsp; ' + c.desc + '</span>' : '';
    }

    function tick(time, date) {
        if (active) $('s-clock').innerHTML = '<div>' + time + '</div><div class="sub">' + date + '</div>';
    }

    // Any key closes the saver; that press then does nothing else
    function poke() {
        if (!active) return false;
        hide();
        return true;
    }

    return {
        init: init, arm: arm, disarm: disarm, show: show, poke: poke, tick: tick,
        isActive: function () { return active; }
    };
})();
