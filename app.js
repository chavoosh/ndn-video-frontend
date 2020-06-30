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
var BASEPREFIX = "/ndn/web/video";
var BASEPREFIX_STATS = "/ndn/video/stats";

var MANIFEST_RESOURCE = null;  // resouce part in manifest uri
var HUB = "localhost"; // default hub

var PUBLIC_IP_ADDRESS = null; // public ip address of the client
/**
 * @summary For local NFD use a port that NFD supports (e.g., 9696).
 * @note The port can be passed to this plugin by using "data-port" attribute in
 *       span tag with manifestUri id in html file.
 */
var PORT;

async function resolveHubs () {
  var response = await fetch("https://ndn-fch.named-data.net/?cap=wss&k=1");
  HUB = await response.text();
}

async function resolvePublicIp () {
  var response = await fetch("https://api.ipify.org/");
  PUBLIC_IP_ADDRESS = await response.text();

  console.debug("PUBLIC_IP_ADDRESS: " + PUBLIC_IP_ADDRESS);
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

async function init() {
  //===================================================//
  // For LOCAL test, COMMENT the following two lines //
  //===================================================//
  await resolveHubs();
  await resolvePublicIp();

  resolvePortAndUri();
  console.debug('Connecting to >>>>> ' + HUB + ':' + PORT);

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
	    useNativeHlsOnSafari: false,
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
