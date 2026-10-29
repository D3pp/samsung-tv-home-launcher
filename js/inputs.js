// HDMI devices for the Devices row: their ports, whether the TV sees them, and switching.
var Inputs = (function () {
    var tvPorts = null;   // HDMI port numbers the TV reports, once known

    function portOf(device) {
        var ports = Prefs.get('devicePorts') || {};
        return ports[device.id] || device.port;
    }

    function setPort(device, port) {
        var ports = Prefs.get('devicePorts') || {};
        ports[device.id] = port;
        Prefs.set('devicePorts', ports);
    }

    function entry(device, connected) {
        var port = device.app ? 0 : portOf(device);
        return {
            id: device.id, name: device.name, port: port, connected: device.app ? true : !!connected[port],
            app: device.app, subtitle: device.subtitle, whenConnected: device.whenConnected,
            color: device.color, color2: device.color2, mark: device.mark, text: device.text
        };
    }

    // The TV's own source objects. setSource only accepts these, not a hand-made {type, number}.
    function sources(done) {
        try {
            tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (vs) {
                Devlog.log('videosource', vs);
                var all = (vs.connected || []).concat(vs.disconnected || []);
                tvPorts = all.filter(function (s) { return s.type === 'HDMI'; })
                    .map(function (s) { return s.number; })
                    .sort(function (a, b) { return a - b; });
                done(vs);
            }, function (err) {
                Devlog.log('videosource-error', err);
                done(null);
            });
        } catch (e) {
            Devlog.log('videosource-exception', String(e));
            done(null);
        }
    }

    // Configured devices, marked connected when the TV reports a signal on their port.
    // `whenConnected` devices only appear while connected.
    function list(done) {
        sources(function (vs) {
            var connected = {};
            ((vs && vs.connected) || []).forEach(function (s) {
                if (s.type === 'HDMI') connected[s.number] = true;
            });
            done(CONFIG.devices
                .map(function (d) { return entry(d, connected); })
                .filter(function (e) { return !e.whenConnected || e.connected; }));
        });
    }

    // Switch the source, then either show it full screen inside the launcher ('inapp'), or hand
    // over to Samsung's TV viewer ('viewer'). On this TV the viewer can reopen its last source
    // instead of the new one, so 'inapp' is the default.
    function open(input, onFail, onShown) {
        var fail = function (stage, err) {
            Devlog.log('switch-failed', { device: input.id, port: input.port, stage: stage, error: err && (err.name + ': ' + err.message) || String(err) });
            onFail(stage);
        };
        if (input.app) {
            tizen.application.launch(input.app, null, function (err) { fail('launch', err); });
            return;
        }
        sources(function (vs) {
            if (!vs) return fail('list', null);
            var all = (vs.connected || []).concat(vs.disconnected || []);
            var source = all.filter(function (s) { return s.type === 'HDMI' && s.number === input.port; })[0];
            if (!source) return fail('no-such-port', 'HDMI ' + input.port + ' not reported by the TV');
            try {
                tizen.tvwindow.setSource(source, function () {
                    var method = Prefs.get('inputMethod');
                    Devlog.log('switched', { device: input.id, port: input.port, method: method });
                    if (method === 'viewer') {
                        tizen.application.launch(CONFIG.tvViewer, function () {
                            Devlog.log('viewer-opened', CONFIG.tvViewer);
                        }, function (err) { fail('viewer', err); });
                        return;
                    }
                    tizen.tvwindow.show(function () {
                        Devlog.log('inapp-shown', { device: input.id });
                        onShown();
                    }, function (err) { fail('show', err); }, ['0px', '0px', '1920px', '1080px'], 'MAIN');
                }, function (err) { fail('setSource', err); });
            } catch (e) {
                fail('setSource-exception', e);
            }
        });
    }

    function hide() {
        try {
            tizen.tvwindow.hide(function () {}, function (err) { Devlog.log('hide-failed', err); }, 'MAIN');
        } catch (e) {
            Devlog.log('hide-exception', String(e));
        }
    }

    return {
        list: list, open: open, hide: hide, portOf: portOf, setPort: setPort,
        ports: function () { return tvPorts && tvPorts.length ? tvPorts : CONFIG.ports; }
    };
})();
