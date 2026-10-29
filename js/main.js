// Screens, focus and remote keys: Home, All apps, Settings and the pop-up menu.
(function () {
    var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 10009, RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406 };
    var APP_STEP = 336;       // app tile width + gap
    var APPS_BEFORE_SCROLL = 3;
    var DEVICE_STEP = 572;    // device tile width + gap
    var GRID_COLUMNS = 5;
    var GRID_ROW = 262;

    var screen = 'home';
    var home = { zone: 'apps', apps: 0, devices: 0 };
    var homeApps = [];
    var devices = [];
    var all = { index: 0, list: [], system: false };
    var settings = { index: 0, page: 'main', mainIndex: 0 };
    var menu = null;

    function $(id) {
        return document.getElementById(id);
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    // ---- Toast ----

    var toastTimer;
    function toast(msg) {
        $('toast').textContent = msg;
        $('toast').className = 'on';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { $('toast').className = ''; }, 2600);
    }

    // ---- Clock ----

    var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function greeting(h) {
        if (h >= 5 && h < 12) return 'Good morning';
        if (h >= 12 && h < 17) return 'Good afternoon';
        if (h >= 17 && h < 22) return 'Good evening';
        return 'Good night';
    }

    // Only the text changes each second, so the colon's pulse keeps running undisturbed
    function setText(id, text) {
        if ($(id).textContent !== text) $(id).textContent = text;
    }

    function tick() {
        var now = new Date();
        var h = now.getHours();
        var hh, ampm = '';
        if (Prefs.get('clock24')) {
            hh = pad(h);
        } else {
            hh = '' + ((h % 12) || 12);
            ampm = h < 12 ? 'AM' : 'PM';
        }
        var mm = pad(now.getMinutes());
        setText('greeting', greeting(h));
        setText('hh', hh);
        setText('mm', mm);
        setText('ampm', ampm);
        setText('weekday', DAYS[now.getDay()]);
        setText('day', now.getDate() + ' ' + MONTHS[now.getMonth()]);
        $('date').style.display = Prefs.get('showDate') ? '' : 'none';
        var date = DAYS[now.getDay()] + ' ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
        Saver.tick(hh + ':' + mm + (ampm ? ' ' + ampm : ''), Prefs.get('showDate') ? date : '');
    }

    function showWeather(c) {
        $('weather').innerHTML = c ? Weather.svg(c.icon) + '<span>' + c.temp + '°&nbsp; ' + c.desc + '</span>' : '';
    }

    // ---- Wallpaper ----

    function wallpaperIndex() {
        var bg = Prefs.get('background');
        if (bg === 'off' || !CONFIG.wallpapers.length) return -1;
        if (bg === 'rotate') return Prefs.get('wallpaper') % CONFIG.wallpapers.length;
        return bg % CONFIG.wallpapers.length;
    }

    function maybeRotate(homeOpened) {
        if (Prefs.get('background') !== 'rotate') return;
        var every = Prefs.get('rotateEvery');
        var due = every === 'home' ? homeOpened : Date.now() - Prefs.get('rotatedAt') >= every * 60000;
        if (!due) return;
        Prefs.set('wallpaper', (Prefs.get('wallpaper') + 1) % CONFIG.wallpapers.length);
        Prefs.set('rotatedAt', Date.now());
    }

    function showWallpaper() {
        var w = $('wall');
        var i = wallpaperIndex();
        if (i < 0) {
            w.style.opacity = 0;
            return;
        }
        var src = CONFIG.wallpapers[i].file;
        if (w.getAttribute('src') === src) {
            w.style.opacity = 1;
            return;
        }
        w.style.opacity = 0;
        setTimeout(function () {
            w.onload = function () { w.style.opacity = 1; };
            w.src = src;
        }, 300);
    }

    function nextWallpaper() {
        var n = CONFIG.wallpapers.length;
        if (!n) return;
        var next = (Math.max(wallpaperIndex(), -1) + 1) % n;
        if (Prefs.get('background') === 'rotate') {
            Prefs.set('wallpaper', next);
            Prefs.set('rotatedAt', Date.now());
        } else {
            Prefs.set('background', next);
        }
        showWallpaper();
        toast(CONFIG.wallpapers[next].name);
    }

    // ---- Tiles ----

    function background(color, color2) {
        if (!color) return '';
        return color2 ? 'linear-gradient(120deg, ' + color + ', ' + color2 + ')' : color;
    }

    // A brand mark (img/marks), a text wordmark, or the TV's own icon, in that order
    function artwork(brand, fallbackIcon, fallbackText) {
        if (brand.mark) {
            var img = el('img', 'brand-mark');
            img.src = brand.mark;
            return img;
        }
        if (brand.text) return el('div', 'wordmark', brand.text);
        if (fallbackIcon) {
            var icon = el('img', 'tv-icon');
            icon.onerror = function () { icon.parentNode.replaceChild(el('div', 'wordmark', fallbackText), icon); };
            icon.src = fallbackIcon;
            return icon;
        }
        return el('div', 'wordmark', fallbackText);
    }

    function appTile(app) {
        var wrap = el('div', 'tile-wrap');
        var tile = el('div', 'tile');
        var brand = Apps.brand(app.id);
        if (brand.color) tile.style.background = background(brand.color, brand.color2);
        tile.appendChild(artwork(brand, app.icon, app.name));
        var b = badge('app:' + app.id);
        if (b) tile.appendChild(b);
        wrap.appendChild(tile);
        wrap.appendChild(el('div', 'label', app.name));
        return wrap;
    }

    function deviceTile(d) {
        var wrap = el('div', 'device');
        wrap.style.background = background(d.color, d.color2);
        var art = el('div', 'device-art');
        art.appendChild(artwork(d, '', d.name.charAt(0)));
        wrap.appendChild(art);
        var text = el('div', 'device-text');
        text.appendChild(el('div', 'device-name', d.name));
        var status = el('div', 'device-port');
        if (d.app) {
            status.appendChild(document.createTextNode(d.subtitle || ''));
        } else {
            status.appendChild(el('span', 'dot' + (d.connected ? ' live' : '')));
            status.appendChild(document.createTextNode('HDMI ' + d.port));
        }
        text.appendChild(status);
        wrap.appendChild(text);
        var b = badge('device:' + d.id);
        if (b) wrap.appendChild(b);
        return wrap;
    }

    // ---- Home ----

    function homeIds() {
        return Prefs.get('homeApps') || CONFIG.homeApps;
    }

    // ---- Number-key shortcuts ----

    function shortcuts() {
        return Prefs.get('shortcuts') || CONFIG.shortcuts;
    }

    function setShortcut(n, target) {
        var copy = {};
        var current = shortcuts();
        for (var k in current) copy[k] = current[k];
        copy[n] = target;
        Prefs.set('shortcuts', copy);
    }

    // The number key that opens this target ('app:<id>' or 'device:<id>'), or 0
    function keyFor(target) {
        var s = shortcuts();
        for (var n = 1; n <= 9; n++) if (s[n] === target) return n;
        return 0;
    }

    function deviceConfig(id) {
        return CONFIG.devices.filter(function (d) { return d.id === id; })[0];
    }

    function runShortcut(n) {
        var target = shortcuts()[n];
        if (!target) return toast('Nothing on ' + n + ' yet: set it in Settings');
        var id = target.slice(target.indexOf(':') + 1);
        if (target.indexOf('app:') === 0) {
            var app = Apps.byId(id);
            return app ? launchApp(app) : toast("That app isn't installed");
        }
        var d = devices.filter(function (x) { return x.id === id; })[0];
        if (!d) return toast((deviceConfig(id) || { name: 'That device' }).name + " isn't connected");
        openDevice(d);
    }

    function badge(target) {
        var n = keyFor(target);
        return n ? el('div', 'badge', '' + n) : null;
    }

    function renderHome() {
        homeApps = homeIds().map(Apps.byId).filter(Boolean);
        var track = $('apps-row').firstChild;
        track.innerHTML = '';
        homeApps.forEach(function (app) { track.appendChild(appTile(app)); });

        var add = el('div', 'tile-wrap add');
        var addTile = el('div', 'tile');
        addTile.appendChild(el('div', 'plus', '+'));
        add.appendChild(addTile);
        add.appendChild(el('div', 'label', 'Add app'));
        track.appendChild(add);

        home.apps = Math.min(home.apps, homeApps.length);
        renderDevices();
        updateHomeFocus();
    }

    var devicesKey = '';

    function renderDevices(onlyIfChanged) {
        Inputs.list(function (list) {
            var key = JSON.stringify(list);
            if (onlyIfChanged && key === devicesKey) return;
            devicesKey = key;
            devices = list;
            var track = $('devices-row').firstChild;
            track.innerHTML = '';
            devices.forEach(function (d) { track.appendChild(deviceTile(d)); });
            var show = devices.length ? '' : 'none';
            $('devices-row').style.display = show;
            $('devices-title').style.display = show;
            if (!devices.length && home.zone === 'devices') home.zone = 'apps';
            home.devices = Math.min(home.devices, Math.max(devices.length - 1, 0));
            updateHomeFocus();
        });
    }

    function updateHomeFocus() {
        var focused = document.querySelectorAll('#home .focused');
        for (var i = 0; i < focused.length; i++) focused[i].classList.remove('focused');

        if (home.zone === 'gear') {
            $('gear').classList.add('focused');
        } else {
            var row = home.zone === 'apps' ? $('apps-row') : $('devices-row');
            var index = home[home.zone];
            var tiles = row.firstChild.children;
            if (tiles[index]) tiles[index].classList.add('focused');

            // Keep the focused tile on screen by sliding the row
            var offset = home.zone === 'apps'
                ? Math.max(0, index - APPS_BEFORE_SCROLL) * APP_STEP
                : Math.max(0, index - 2) * DEVICE_STEP;
            row.firstChild.style.transform = 'translateX(' + -offset + 'px)';
        }
        updateHints();
    }

    function hint(key, text) {
        return '<span class="key">' + key + '</span><span class="what">' + text + '</span>';
    }

    function updateHints() {
        var h;
        if (home.zone === 'gear') h = hint('OK', 'Settings') + hint('▼', 'Apps');
        else if (home.zone === 'devices') h = hint('OK', 'Switch input') + hint('▲', 'Apps');
        else if (home.apps === homeApps.length) h = hint('OK', 'Add an app') + hint('▲', 'Settings');
        else h = hint('OK', 'Open') + hint('▲', 'Settings');
        $('hints').innerHTML = h;
    }

    function setHomeApps(ids) {
        Prefs.set('homeApps', ids);
        renderHome();
    }

    function tileMenu(index) {
        var ids = homeIds().slice();
        var id = homeApps[index].id;
        var pos = ids.indexOf(id);
        var items = [];
        if (pos > 0) {
            items.push({ label: 'Move left', action: function () {
                ids.splice(pos, 1);
                ids.splice(pos - 1, 0, id);
                home.apps = index - 1;
                setHomeApps(ids);
            } });
        }
        if (pos < ids.length - 1) {
            items.push({ label: 'Move right', action: function () {
                ids.splice(pos, 1);
                ids.splice(pos + 1, 0, id);
                home.apps = index + 1;
                setHomeApps(ids);
            } });
        }
        items.push({ label: 'Remove from Home', action: function () {
            ids.splice(pos, 1);
            setHomeApps(ids);
        } });
        openMenu(homeApps[index].name, items);
    }

    function homeKey(k) {
        var zone = home.zone;
        if (k === KEY.LEFT && zone !== 'gear') {
            if (home[zone] > 0) home[zone]--;
        } else if (k === KEY.RIGHT && zone !== 'gear') {
            var max = zone === 'apps' ? homeApps.length : devices.length - 1;
            if (home[zone] < max) home[zone]++;
        } else if (k === KEY.UP) {
            if (zone === 'apps') home.zone = 'gear';
            else if (zone === 'devices') home.zone = 'apps';
        } else if (k === KEY.DOWN) {
            if (zone === 'gear') home.zone = 'apps';
            else if (zone === 'apps' && devices.length) home.zone = 'devices';
        } else if (k === KEY.OK) {
            if (zone === 'gear') return openSettings();
            if (zone === 'apps') {
                if (home.apps === homeApps.length) return openAll();
                return launchApp(homeApps[home.apps]);
            }
            return openDevice(devices[home.devices]);
        } else if (k >= 49 && k <= 57) {
            return runShortcut(k - 48);
        } else if (k === KEY.RED) {
            return openAll();
        } else if (k === KEY.GREEN) {
            return nextWallpaper();
        } else if (k === KEY.YELLOW) {
            if (zone === 'apps' && home.apps < homeApps.length) tileMenu(home.apps);
            return;
        }
        // Back does nothing on Home: there is nowhere further back to go
        updateHomeFocus();
    }

    function openDevice(d) {
        Inputs.open(d, function (stage) {
            toast(stage === 'no-such-port'
                ? 'The TV has no HDMI ' + d.port + ': set the port in Settings'
                : "Couldn't switch to " + d.name + ' (' + stage + ')');
        }, function () { startWatching(d); });
    }

    function launchApp(app) {
        Apps.launch(app, function (err) {
            Devlog.log('launch-failed', { app: app.id, error: err && err.message });
            toast("Couldn't open " + app.name);
        });
    }

    // ---- Screens ----

    function show(name) {
        screen = name;
        ['home', 'all', 'settings'].forEach(function (s) {
            $(s).className = 'screen' + (s === 'home' ? '' : ' panel') + (s === name ? ' on' : '');
        });
    }

    // ---- Watching an HDMI device inside the launcher ----

    // The TV draws the video underneath the page, so everything on top has to go transparent
    function startWatching(d) {
        show('watching');
        document.documentElement.classList.add('watching');
        toast(d.name + ' · Back returns to Home');
    }

    function stopWatching() {
        Inputs.hide();
        document.documentElement.classList.remove('watching');
        goHome();
    }

    function watchingKey(k) {
        if (k === KEY.BACK) stopWatching();
    }

    function goHome() {
        show('home');
        renderHome();
    }

    // ---- All apps ----

    function openAll() {
        all.index = 0;
        show('all');
        renderAll();
    }

    function renderAll() {
        all.list = Apps.userApps(all.system);
        var grid = $('all-grid');
        grid.innerHTML = '';
        all.list.forEach(function (app) {
            var tile = appTile(app);
            if (homeIds().indexOf(app.id) >= 0) tile.firstChild.appendChild(el('div', 'pin'));
            grid.appendChild(tile);
        });
        $('all-hint').textContent = all.system ? '· including system apps' : '';
        all.index = Math.min(all.index, Math.max(all.list.length - 1, 0));
        updateAllFocus();
    }

    function updateAllFocus() {
        var tiles = $('all-grid').children;
        for (var i = 0; i < tiles.length; i++) tiles[i].classList.toggle('focused', i === all.index);
        var row = Math.floor(all.index / GRID_COLUMNS);
        $('all-grid').style.transform = 'translateY(' + -Math.max(0, row - 1) * GRID_ROW + 'px)';
        $('all-id').textContent = all.list[all.index] ? all.list[all.index].id : 'No apps found';
    }

    function allKey(k) {
        var n = all.list.length;
        if (k === KEY.BACK) return goHome();
        if (k === KEY.YELLOW) {
            all.system = !all.system;
            return renderAll();
        }
        if (!n) return;
        if (k === KEY.LEFT && all.index % GRID_COLUMNS > 0) all.index--;
        else if (k === KEY.RIGHT && all.index % GRID_COLUMNS < GRID_COLUMNS - 1 && all.index < n - 1) all.index++;
        else if (k === KEY.UP && all.index >= GRID_COLUMNS) all.index -= GRID_COLUMNS;
        else if (k === KEY.DOWN && all.index + GRID_COLUMNS < n) all.index += GRID_COLUMNS;
        else if (k === KEY.OK) return appMenu(all.list[all.index]);
        updateAllFocus();
    }

    function appMenu(app) {
        var ids = homeIds().slice();
        var onHome = ids.indexOf(app.id) >= 0;
        openMenu(app.name, [
            { label: 'Open', action: function () { launchApp(app); } },
            onHome ? { label: 'Remove from Home', action: function () {
                ids.splice(ids.indexOf(app.id), 1);
                Prefs.set('homeApps', ids);
                renderAll();
                toast('Removed from Home');
            } } : { label: 'Add to Home', action: function () {
                ids.push(app.id);
                Prefs.set('homeApps', ids);
                renderAll();
                toast('Added to Home');
            } }
        ]);
    }

    // ---- Settings ----

    function backgroundChoices() {
        var c = [{ v: 'off', text: 'Off' }];
        CONFIG.wallpapers.forEach(function (w, i) { c.push({ v: i, text: w.name }); });
        c.push({ v: 'rotate', text: 'Rotate' });
        return c;
    }

    function portChoices() {
        return Inputs.ports().map(function (p) { return { v: p, text: 'HDMI ' + p }; });
    }

    // One "which port" row per HDMI device (app entries have no port)
    function deviceSettings() {
        return CONFIG.devices.filter(function (d) { return !d.app; }).map(function (d) {
            return {
                label: d.name, choices: portChoices,
                get: function () { return Inputs.portOf(d); },
                set: function (v) { Inputs.setPort(d, v); }
            };
        });
    }

    // Everything a number key can open: nothing, a device, or an app
    function targetChoices() {
        var c = [{ v: '', text: 'Nothing' }];
        CONFIG.devices.forEach(function (d) { c.push({ v: 'device:' + d.id, text: d.name }); });
        Apps.userApps(false).forEach(function (a) { c.push({ v: 'app:' + a.id, text: a.name }); });
        return c;
    }

    function shortcutSettings() {
        var rows = [];
        for (var n = 1; n <= 9; n++) {
            (function (n) {
                rows.push({
                    label: 'Key ' + n, choices: targetChoices,
                    get: function () { return shortcuts()[n] || ''; },
                    set: function (v) { setShortcut(n, v); }
                });
            })(n);
        }
        return rows;
    }

    var SETTINGS = [
        { label: 'Background', key: 'background', choices: backgroundChoices },
        { label: 'Change photo', key: 'rotateEvery', when: function () { return Prefs.get('background') === 'rotate'; },
            choices: [{ v: 'home', text: 'Each time Home opens' }, { v: 5, text: 'Every 5 minutes' },
                { v: 15, text: 'Every 15 minutes' }, { v: 60, text: 'Every hour' }, { v: 1440, text: 'Daily' }] },
        { label: 'Clock', key: 'clock24', choices: [{ v: true, text: '24-hour' }, { v: false, text: '12-hour' }] },
        { label: 'Date', key: 'showDate', choices: [{ v: true, text: 'Shown' }, { v: false, text: 'Hidden' }] },
        { label: 'App names', key: 'appNames',
            choices: [{ v: 'always', text: 'Always' }, { v: 'focus', text: 'When selected' }, { v: 'never', text: 'Never' }] },
        { devices: true },
        { label: 'Open devices', key: 'inputMethod',
            choices: [{ v: 'inapp', text: 'Inside the launcher' }, { v: 'viewer', text: "Samsung's TV viewer" }] },
        { label: 'Number-key shortcuts', action: function () { openSettingsPage('shortcuts'); } },
        { label: 'Screen saver', key: 'saverAfter',
            choices: [{ v: 0, text: 'Off' }, { v: 3, text: 'After 3 minutes' }, { v: 5, text: 'After 5 minutes' },
                { v: 10, text: 'After 10 minutes' }, { v: 15, text: 'After 15 minutes' }] },
        { label: 'Go dark after', key: 'darkAfter', when: function () { return Prefs.get('saverAfter') > 0; },
            choices: [{ v: 30, text: '30 minutes' }, { v: 60, text: '1 hour' }, { v: 120, text: '2 hours' }, { v: 0, text: 'Never' }] },
        { label: 'Show screen saver now', action: function () { goHome(); Saver.show(); } },
        { label: 'Refresh app list', action: function () { Apps.load(function () { toast('App list refreshed'); }); } },
        { label: 'Samsung Home', action: function () {
            tizen.application.launch(CONFIG.samsungHome, null, function () { toast("Couldn't open Samsung Home"); });
        } },
        { label: 'Reset all settings', action: function () {
            openMenu('Reset all settings?', [{ label: 'Reset', action: function () {
                Prefs.reset();
                applyPrefs();
                renderSettings();
                toast('Settings reset');
            } }]);
        } }
    ];

    var PAGE_TITLES = { main: 'Settings', shortcuts: 'Number-key shortcuts' };
    var PAGE_FOOTNOTES = {
        main: 'Red: all apps &nbsp;·&nbsp; Green: next wallpaper &nbsp;·&nbsp; Yellow on a Home tile: move or remove',
        shortcuts: 'On Home, press 1–9 to open what you set here &nbsp;·&nbsp; No number buttons? Press 123 on the remote'
    };

    function openSettingsPage(page) {
        if (page === 'shortcuts') settings.mainIndex = settings.index;
        settings.page = page;
        settings.index = page === 'main' ? settings.mainIndex || 0 : 0;
        $('settings').querySelector('h1').textContent = PAGE_TITLES[page];
        $('settings').querySelector('.footnote').innerHTML = PAGE_FOOTNOTES[page];
        renderSettings();
    }

    function visibleSettings() {
        if (settings.page === 'shortcuts') return shortcutSettings();
        var rows = [];
        SETTINGS.forEach(function (s) {
            if (s.devices) rows = rows.concat(deviceSettings());
            else if (!s.when || s.when()) rows.push(s);
        });
        return rows;
    }

    function choicesOf(s) {
        return typeof s.choices === 'function' ? s.choices() : s.choices;
    }

    function valueOf(s) {
        return s.get ? s.get() : Prefs.get(s.key);
    }

    function openSettings() {
        settings.mainIndex = 0;
        show('settings');
        openSettingsPage('main');
    }

    function renderSettings() {
        var list = $('settings-list');
        list.innerHTML = '';
        var rows = visibleSettings();
        settings.index = Math.min(settings.index, rows.length - 1);
        rows.forEach(function (s, i) {
            var row = el('div', 'setting' + (i === settings.index ? ' focused' : '') + (s.action ? ' action' : ''));
            row.appendChild(el('span', 'name', s.label));
            if (s.choices) {
                var current = valueOf(s);
                var choice = choicesOf(s).filter(function (c) { return c.v === current; })[0];
                row.appendChild(el('span', 'value', '‹  ' + (choice ? choice.text : '') + '  ›'));
            }
            list.appendChild(row);
        });
        var top = Math.max(0, settings.index - 6) * 84;
        list.style.transform = 'translateY(' + -top + 'px)';
    }

    function settingsKey(k) {
        var rows = visibleSettings();
        var s = rows[settings.index];
        if (k === KEY.BACK) return settings.page === 'shortcuts' ? openSettingsPage('main') : goHome();
        if (k === KEY.UP && settings.index > 0) settings.index--;
        else if (k === KEY.DOWN && settings.index < rows.length - 1) settings.index++;
        else if ((k === KEY.LEFT || k === KEY.RIGHT || k === KEY.OK) && s.choices) {
            var choices = choicesOf(s);
            var at = 0;
            for (var i = 0; i < choices.length; i++) if (choices[i].v === valueOf(s)) at = i;
            at = (at + (k === KEY.LEFT ? choices.length - 1 : 1)) % choices.length;
            if (s.set) s.set(choices[at].v);
            else Prefs.set(s.key, choices[at].v);
            applyPrefs();
        } else if (k === KEY.OK && s.action) {
            return s.action();
        }
        renderSettings();
    }

    function applyPrefs() {
        document.body.className = 'names-' + Prefs.get('appNames');
        tick();
        showWallpaper();
    }

    // ---- Pop-up menu ----

    function openMenu(title, items) {
        menu = { items: items.concat([{ label: 'Cancel', action: function () {} }]), index: 0 };
        $('menu-title').textContent = title;
        renderMenu();
        $('menu').className = 'on';
    }

    function renderMenu() {
        var box = $('menu-items');
        box.innerHTML = '';
        menu.items.forEach(function (item, i) {
            box.appendChild(el('div', 'item' + (i === menu.index ? ' focused' : ''), item.label));
        });
    }

    function closeMenu() {
        menu = null;
        $('menu').className = '';
    }

    function menuKey(k) {
        if (k === KEY.BACK) return closeMenu();
        if (k === KEY.UP && menu.index > 0) menu.index--;
        else if (k === KEY.DOWN && menu.index < menu.items.length - 1) menu.index++;
        else if (k === KEY.OK) {
            var item = menu.items[menu.index];
            closeMenu();
            return item.action();
        }
        renderMenu();
    }

    // ---- Keys ----

    // In a desktop browser: Esc/Backspace = Back, R G Y B = the colour keys
    var BROWSER_KEYS = { 27: KEY.BACK, 8: KEY.BACK, 82: KEY.RED, 71: KEY.GREEN, 89: KEY.YELLOW, 66: KEY.BLUE };

    document.addEventListener('keydown', function (e) {
        var k = tizen.mock && BROWSER_KEYS[e.keyCode] ? BROWSER_KEYS[e.keyCode] : e.keyCode;
        var known = k >= 49 && k <= 57;   // number keys 1-9
        for (var name in KEY) if (KEY[name] === k) known = true;
        if (!known) return;
        e.preventDefault();

        if (Saver.poke()) return;
        if (menu) menuKey(k);
        else if (screen === 'home') homeKey(k);
        else if (screen === 'all') allKey(k);
        else if (screen === 'watching') watchingKey(k);
        else settingsKey(k);
        Saver.arm();
    });

    // ---- Start-up ----

    function homeIsShowing() {
        return screen === 'home' && !menu && !document.hidden;
    }

    function start() {
        Devlog.log('boot', { userAgent: navigator.userAgent, prefs: localStorage.getItem('minlaunch.prefs') });
        if (Prefs.get('portsVersion') !== CONFIG.portsVersion) {
            Prefs.set('devicePorts', null);
            Prefs.set('portsVersion', CONFIG.portsVersion);
        }
        ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', '1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(function (k) {
            try { tizen.tvinputdevice.registerKey(k); } catch (e) {}
        });
        Saver.init(homeIsShowing);
        maybeRotate(true);
        applyPrefs();
        setInterval(tick, 1000);

        showWeather(Weather.current());
        Weather.refresh(showWeather);
        setInterval(function () { Weather.refresh(showWeather); }, 15 * 60000);

        // Notice devices being plugged in or switched on (the PS5 tile appears) while Home is open
        setInterval(function () {
            if (homeIsShowing() && !Saver.isActive()) renderDevices(true);
        }, 15000);

        // Timed wallpaper rotation, only while Home is in view
        setInterval(function () {
            if (homeIsShowing() && !Saver.isActive()) {
                maybeRotate(false);
                showWallpaper();
            }
        }, 60000);

        Apps.load(renderHome);
        Saver.arm();
    }

    // Coming back from an app: fresh app list and inputs, next wallpaper if set to "each time"
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            Saver.disarm();
            return;
        }
        if (screen === 'home') {
            maybeRotate(true);
            showWallpaper();
        }
        Apps.load(function () {
            if (screen === 'home') renderHome();
        });
        Saver.arm();
    });

    window.onload = start;
})();
