// Development log: sends events to CONFIG.devLogUrl (tools/devlog.py on your computer) so you
// can see what the TV did. Does nothing when devLogUrl is null.
var Devlog = (function () {
    var queue = [];
    var timer;

    // Tizen's host objects don't serialise with JSON.stringify, so copy their fields out
    function plain(value, depth) {
        depth = depth || 0;
        if (value === null || typeof value !== 'object' || depth > 3) return value;
        if (Array.isArray(value)) return value.map(function (v) { return plain(v, depth + 1); });
        var out = {};
        for (var k in value) {
            if (typeof value[k] !== 'function') out[k] = plain(value[k], depth + 1);
        }
        return out;
    }

    function flush() {
        if (!queue.length) return;
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', CONFIG.devLogUrl);
            xhr.setRequestHeader('Content-Type', 'text/plain');
            xhr.send(queue.join('\n'));
        } catch (e) {}
        queue = [];
    }

    function log(event, data) {
        if (!CONFIG.devLogUrl) return;
        queue.push(JSON.stringify({ t: new Date().toISOString(), event: event, data: plain(data) }));
        clearTimeout(timer);
        timer = setTimeout(flush, 300);
    }

    window.addEventListener('error', function (e) {
        log('js-error', { message: e.message, file: e.filename, line: e.lineno });
    });

    return { log: log };
})();
