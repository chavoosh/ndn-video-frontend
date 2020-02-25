/**
 * @summary We make an assumption that the very first request is for
 *          manifest file of the video, where the name looks like:
 *              <protocol>://<base-prefix>/<name-of-manifest-file>.<extenstion>
 *                  e.g., https:///ndn/web/video/solo/playlist.m3u8
 *
 * Based on this assumption we retrieve the base prefix part of the request
 * so it can be used to generate stats Interests.
 *
 * @note leave BASEPREFIX null, if you want it to be determined automatically.
 */
var HOST = ''; 

function initApp() {
  // resolve host name
  var parser = document.createElement('a');
  parser.href = document.getElementById("manifestUri").textContent;
  HOST = parser.host;

  // set log level
  shaka.log.setLevel(shaka.log.Level.V1);

  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();
 
  // Check to see if the browser supports the basic APIs Shaka needs.
  if (shaka.Player.isBrowserSupported()) {
    // Everything looks good!
    initPlayer();
  } else {
    // This browser does not have the minimum set of APIs we need.
    console.error('Browser not supported!');
  }
}
function initPlayer() {
  console.debug('CONNECTING TO =======> ip@' + HOST);

  // Create a Player instance.
  var video = document.getElementById('video');
  var player = new shaka.Player(video);

  console.log(player.getConfiguration());
  // Attach player to the window to make it easy to access in the JS console.
  window.player = player;

  // Listen for error events.
  player.addEventListener('error', onErrorEvent);

  // configure player
  player.configure({
    streaming: {
      bufferingGoal: 20,
      bufferBehind: 20,
      retryParameters: {
        maxAttempts: 3,
        timeout: 10000
      }
    },
  });

  // Try to load a manifest.
  // This is an asynchronous process.
  var MANIFEST_RESOURCE = document.getElementById("manifestUri").textContent;
  player.load(MANIFEST_RESOURCE).then(function() {
    // This runs if the asynchronous load is successful.
    console.log('The video has now been loaded!');
  }).catch(onError);  // onError is executed if the asynchronous load fails.
}

function onErrorEvent(event) {
  // Extract the shaka.util.Error object from the event.
  onError(event.detail);
}

function onError(error) {
  // Log the error.
  console.error('Error code', error.code, 'object', error);
}

document.addEventListener('DOMContentLoaded', initApp);
