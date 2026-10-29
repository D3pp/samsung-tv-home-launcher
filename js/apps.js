// Installed apps: listing, filtering out the TV's many internal services, and launching.
var Apps = (function () {
    var list = [];
    var byIdMap = {};
    var selfId = '';

    // getAppsInfo reports lots of internal services as visible, so All apps keeps store-style
    // ids (AbCdEfGhIj.Name or numeric) plus a short list of preinstalled apps.
    var STORE_ID = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/;
    var NOT_AN_APP = /service|worker|agent|daemon|e-?manual|provider|plugin|extension|privacy|cms|launcher/i;

    function brand(id) {
        return CONFIG.brands[id] || {};
    }

    function load(done) {
        try { selfId = tizen.application.getCurrentApplication().appInfo.id; } catch (e) {}
        tizen.application.getAppsInfo(function (infos) {
            list = [];
            byIdMap = {};
            infos.forEach(function (a) {
                if (a.id === selfId) return;
                var app = {
                    id: a.id,
                    name: brand(a.id).name || a.name || a.id,
                    rawName: a.name || '',
                    icon: a.iconPath || '',
                    visible: a.show !== false
                };
                list.push(app);
                byIdMap[a.id] = app;
            });
            list.sort(function (x, y) { return x.name.toLowerCase() < y.name.toLowerCase() ? -1 : 1; });
            done();
        }, function () { done(); });
    }

    function isUserFacing(a) {
        if (!a.visible) return false;
        if (CONFIG.brands[a.id] || CONFIG.consumerApps.indexOf(a.id) >= 0) return true;
        if (NOT_AN_APP.test(a.id + ' ' + a.rawName)) return false;
        return STORE_ID.test(a.id) || /^\d+$/.test(a.id);
    }

    function userApps(includeSystem) {
        return list.filter(function (a) { return includeSystem || isUserFacing(a); });
    }

    function launch(app, onFail) {
        var b = brand(app.id);
        if (b.module) {
            // TizenBrew reads the first app-control value as JSON naming the module to open
            var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null,
                [new tizen.ApplicationControlData('module', [JSON.stringify(b.module)])]);
            tizen.application.launchAppControl(control, app.id, null, function () {
                tizen.application.launch(app.id, null, onFail);
            });
            return;
        }
        tizen.application.launch(app.id, null, onFail);
    }

    return {
        load: load,
        byId: function (id) { return byIdMap[id] || null; },
        userApps: userApps,
        launch: launch,
        brand: brand
    };
})();
