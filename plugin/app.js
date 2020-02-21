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

var BASEPREFIX = "/ndn/web/video"; // prefix of all video files
var BASEPREFIX_STATS = "/ndn/video/stats"; // prefix under which stats Interests will be sent
var MANIFEST_RESOURCE = null;  // resouce part in manifest uri
var HUB = "hobo.cs.arizona.edu"; // chosen hub
var HUBS = []; // list of resolved hubs from FCH + localhost
var PUBLIC_IP_ADDRESS = null; // public ip address of client

var N_ATTEMPTS = 4;
var hubIsChosen = 0;

var PORT;

function resolveHubs () {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', "https://ndn-fch.named-data.net/?cap=wss&k=3", false); // get 3 hubs
  xhr.send();

  // save hubs into a list
  //HUBS = xhr.responseText.split(",");
  //HUBS.push("hobo.cs.arizona.edu");
  //HUBS.push("suns.cs.ucla.edu");
  HUBS.push("wundngw.arl.wustl.edu");
  //HUBS.push("localhost");
  console.log("Candidate hubs: ", HUBS);
}

function resolvePublicIp () {
  var xhr = new XMLHttpRequest();
  // sync request because we need to know client IP address
  xhr.open('GET', "https://api.ipify.org/", false);
  xhr.send();

  PUBLIC_IP_ADDRESS = xhr.responseText;
  console.log(PUBLIC_IP_ADDRESS);
}

function resolveUri () {
  MANIFEST_RESOURCE = document.getElementById("manifestUri").textContent;
}

function resolvePort () {
  PORT = (HUB === 'localhost') ? 9696 : 443;
  if (document.getElementById("manifestUri").hasAttribute("data-port")) {
  var p = document.getElementById("manifestUri").getAttribute("data-port");
    if (isNaN(p))
      console.warn(p + ' is not a vlid port number, use ' + PORT);
    else if (p !== '9696' && HUB === 'localhost')
        console.warn(p + ' is not supported by local NFD, use ' + PORT);
    else
      PORT = Number(p);
  }
}

/**
 * @summary fetch manifest file from each each resolved hub,
            in parallel and call the player for the hub who delivered the file, first
 *
 * @param callback A callback function
 * @param retiresOnNoConnection The number of times to test content retrieval from resolved hubs before giving up
 */
function hubTester(callback, retiresOnNoConnection) {
  // create an interest for manifest file
  var interest = new Interest(new Name(MANIFEST_RESOURCE));
  interest.setInterestLifetimeMilliseconds(1000);

  for (i = 0; i < HUBS.length; i++) {
    var face;
    if (HUBS[i] == "localhost")
      face = new Face({host: HUBS[i], port: 9696});
    else
      face = new Face({host: "wss://" + HUBS[i] + "/ws/", port: 443});

    SegmentFetcher.fetch(face, interest, null,
      function(content) { // onComplete
        var hub = this.face.connectionInfo.host == "localhost" ?
                  "localhost" :
                  this.face.connectionInfo.host.split("/")[2].split(":")[0];
        HUB = hub;
        callback(); // callback the player
      },
      function(errorCode, message) { // onError
        shaka.log.debug('Error ' + errorCode + ': ' + message);
      },
      {pipeline: "cubic"}
    );
  }

  // check if a hub is chosen after 1 sec, if there's no chosen hub, retry.
  setTimeout(function() {
    if(hubIsChosen == 0 && retiresOnNoConnection > 0) {
      console.log("No hub is responding, retry...");
      hubTester(callback, retiresOnNoConnection - 1);
    }
  }, 2000)
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
  resolveUri();
  resolveHubs();
  resolvePublicIp();

  hubTester(function() {
    if (hubIsChosen == 1) return; // another hub is already chosen
    hubIsChosen = 1; // update the flag

    resolvePort();
    console.debug('CONNECTING TO =======> ndn@' + HUB + ':' + PORT);
   
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
          maxAttempts: 3,
          timeout: 4000
        }
      },
    });

    // Try to load a manifest.
    // This is an asynchronous process.
    player.load('https://' + HUB + MANIFEST_RESOURCE).then(function() {
      // This runs if the asynchronous load is successful.
      console.log('The video has now been loaded!');
    }).catch(onError);  // onError is executed if the asynchronous load fails.
  }, N_ATTEMPTS);
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
