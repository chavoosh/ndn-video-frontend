/**
 * @summary We make an assumption that the very first request is for
 *          manifest file of the video.
 */

// This should match the prefix of all files
var BASEPREFIX = "/ndn/web";

var MANIFEST_RESOURCE = null;  // resouce part in manifest uri
var HUB = "hobo.cs.arizona.edu"; // default hub

var PUBLIC_IP_ADDRESS = null; // public ip address of client

/**
 * @summary The available ports are 443 and 9696.
 * @note The port can be passed to this plugin by using "data-port" attribute in
 *       span tag with manifestUri id in html file.
 */
var PORT = null;

function resolveHubs () {
  MANIFEST_RESOURCE = document.getElementById("manifestUri").textContent;

  var xhr = new XMLHttpRequest();
  xhr.open('GET', "https://ndn-fch.named-data.net/?cap=wss&k=1", false); // get 3 hubs
  xhr.send();

  // save hubs into a list
  HUB = xhr.responseText;

  console.log("Resolved Closest Hub: ", HUB);
}

function resolvePublicIp () {
  var xhr = new XMLHttpRequest();
  // sync request because we need to know client IP address
  xhr.open('GET', "https://api.ipify.org/", false);
  xhr.send();

  PUBLIC_IP_ADDRESS = xhr.responseText;
  console.log(PUBLIC_IP_ADDRESS);
}

function resolvePort () {
  if (PORT === null) {
    if (document.getElementById("manifestUri").hasAttribute("data-port")) {
    PORT = document.getElementById("manifestUri").getAttribute("data-port");
      if (PORT !== "443" && PORT !== "9696") {
        console.log('Warning: port ' + port + ' cannot be used' );
        PORT = 443;
      }
    }
    else
      PORT = 443; // default
  }
}

function initApp() {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();

  // Check to see if the browser supports the basic APIs Shaka needs.
  if (shaka.Player.isBrowserSupported()) {
    // Everything looks good!
    initPlayer();
  } else {
    // This browser does not have the minimum set of APIs we need.
    console.log('Browser not supported, switch to native HLS...');
    nativeHls();
  }
}

function initPlayer() {
  resolveHubs();
  resolvePublicIp();
  resolvePort();

  // Create a Player instance.
  var video = document.getElementById('video');
  var player = new shaka.Player(video);

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
        maxAttempts: 1,
        timeout: 0
      }
    },
  });

  // Try to load a manifest (this is an asynchronous process)
  player.load('https://' + HUB + MANIFEST_RESOURCE).then(function() {
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
