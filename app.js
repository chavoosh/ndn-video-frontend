/**
 * Copyright (c) 2019, Regents of the University of Arizona.
 * Author: Chavoosh Ghasemi <chghasemi@cs.arizona.edu>
 *         Shaka Player project <https://github.com/google/shaka-player>
 *
 * You should have received a copy of the GNU General Public License along with
 * this script e.g., in COPYING.md file. If not, see <http://www.gnu.org/licenses/>.
 *
 * NOTE: We make an assumption that the very first request is for
 *       manifest file of the video.
 */

// This should match the prefix of all files (e.g., your NFD cert identity)
var BASEPREFIX = "/ndn/web";

var MANIFEST_RESOURCE = null;  // resouce part in manifest uri
var HUB = "localhost"; // default hub

var PUBLIC_IP_ADDRESS = null; // public ip address of the client
/**
 * @summary For local NFD use a port that NFD supports (e.g., 9696).
 * @note The port can be passed to this plugin by using "data-port" attribute in
 *       span tag with manifestUri id in html file.
 */
var PORT;

function resolveHubs () {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', "https://ndn-fch.named-data.net/?cap=wss&k=1", false); // get 3 hubs
  xhr.send();

  // save hub into a list
  HUB = xhr.responseText;

}

function resolvePublicIp () {
  var xhr = new XMLHttpRequest();
  // sync request because we need to know client IP address
  xhr.open('GET', "https://api.ipify.org/", false);
  xhr.send();

  PUBLIC_IP_ADDRESS = xhr.responseText;
  console.debug(PUBLIC_IP_ADDRESS);
}

function resolvePortAndUri () {
  MANIFEST_RESOURCE = document.getElementById("manifestUri").textContent;
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

function init() {
  //===================================================//
  // For LOCAL test, COMMENT the following two lines //
  //===================================================//
  //resolveHubs();
  //resolvePublicIp();

  resolvePortAndUri();
  console.debug('Connected >>>>> ' + HUB + ':' + PORT);

  // When using the UI, the player is made automatically by the UI object.
  var video = document.getElementById('video');
  const ui = video['ui'];
  const controls = ui.getControls();
  const player = controls.getPlayer();
  window.player = ui.player_;

  // Listen for error events.
  player.addEventListener('error', onPlayerErrorEvent);
  controls.addEventListener('error', onUIErrorEvent);

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

  // Try to load a manifest.
  // This is an asynchronous process.
  try {
    player.load('https://' + HUB + MANIFEST_RESOURCE);
    // This runs if the asynchronous load is successful.
    console.log('The video has now been loaded!');
  } catch (error) {
    onPlayerError(error);
  }
}

function onPlayerErrorEvent(errorEvent) {
  // Extract the shaka.util.Error object from the event.
  onPlayerError(event.detail);
}

function onPlayerError(error) {
  // Handle player error
  console.error('Error code', error.code, 'object', error);
}

function onUIErrorEvent(errorEvent) {
  // Extract the shaka.util.Error object from the event.
  onPlayerError(event.detail);
}

function initFailed() {
  // Handle the failure to load
  console.error('Unable to load the UI library!');
}

// Wait until the UI is loaded.
document.addEventListener('shaka-ui-loaded', init);
document.addEventListener('shaka-ui-load-failed', initFailed);
