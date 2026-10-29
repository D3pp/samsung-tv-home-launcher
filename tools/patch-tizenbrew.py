# Fixes TizenBrew's autolaunch (and the launcher's "open TizenTube directly" tile) on TVs where
# it lands on TizenBrew's menu instead.
#
# Cause: after TizenBrew restarts itself in debug mode, its service sends "open this module" to
# whichever UI socket it has stored. Its readiness check also passes for the socket from before
# the restart (marked ready, but now closed), so the message is lost.
# Fix: wait until the *current* socket is actually open, and check again at send time.
#
#   python3 tools/patch-tizenbrew.py <extracted TizenBrew folder>
# Usually run through tools/patch-tizenbrew.sh, which also unpacks and re-signs the .wgt.
import os
import sys

OLD = """function sendClientInformation(clientConn, data) {
  var clientConnection = clientConn.get('wsConn');
  if (clientConnection && clientConnection.connection && clientConnection.connection.readyState !== WebSocket.OPEN && !clientConnection.isReady || !clientConnection) {
    return setTimeout(function () {
      return sendClientInformation(clientConn, data);
    }, 50);
  }
  setTimeout(function () {
    clientConnection.send(data);
  }, 500);
}"""

NEW = """function sendClientInformation(clientConn, data) {
  // Patched: wait for the current UI socket to be open. The old check let a closed
  // connection from before the debug relaunch through, so autolaunch messages were lost.
  var clientConnection = clientConn.get('wsConn');
  if (!clientConnection || !clientConnection.connection || clientConnection.connection.readyState !== WebSocket.OPEN) {
    return setTimeout(function () {
      return sendClientInformation(clientConn, data);
    }, 50);
  }
  setTimeout(function () {
    var current = clientConn.get('wsConn');
    if (current && current.connection && current.connection.readyState === WebSocket.OPEN) current.send(data);
    else sendClientInformation(clientConn, data);
  }, 500);
}"""

path = os.path.join(sys.argv[1], 'service-nextgen', 'service', 'dist', 'index.js')
source = open(path, encoding='utf-8').read()
if 'Patched: wait for the current UI socket' in source:
    print('already patched')
    sys.exit(0)
if source.count(OLD) != 1:
    sys.exit('This TizenBrew version is different: the code to patch was not found. '
             'Check whether autolaunch already works with it unpatched.')
open(path, 'w', encoding='utf-8').write(source.replace(OLD, NEW))
print('patched ' + path)
