/**
 * Copyright (c) 2016-2019, Regents of the University of Arizona.
 * Author: Chavoosh Ghasemi <chghasemi@cs.arizona.edu>
 *         Shaka Player project <https://github.com/google/shaka-player>
 *
 * You should have received a copy of the GNU General Public License along with
 * this script e.g., in COPYING.md file. If not, see <http://www.gnu.org/licenses/>.
 */

goog.require('goog.asserts');
goog.require('shaka.net.NetworkingEngine');
goog.require('shaka.util.AbortableOperation');
goog.require('shaka.util.Error');

var face = null;
var host = null;
Log.LOG = 3; // log level for ndn-js

var sessionNo = Math.floor(Math.random() * Math.pow(10, 12));
var startupDelay = 0; // startup delay of the video
var rebufferingArray = []; // keep the index of buffering events in `stateHistory` (exclude startup)

statsCode = {
  DONE: 1,
  ERROR: 2
};

/**
 * @namespace
 * @summary A networking plugin to handle http and https URIs via NDN.
 * @param {string} uri
 * @param {shaka.extern.Request} request
 * @param {shaka.net.NetworkingEngine.RequestType} requestType
 * @param {function(number, number)=} progressUpdated Called when a progress
 *        event happened.
 * @return {!shaka.extern.IAbortableOperation.<shaka.extern.Response>}
 * @export
 */
shaka.net.HttpNdnPlugin = function(uri, request, requestType, progressUpdated) {
  // Last time stamp when we got a progress event.
  var startTime = Date.now();
  //console.log(uri);
  // Last number of bytes loaded, from progress event.
  var lastLoaded = 0;
  var promise = new Promise(function(resolve, reject) {
    var parser = document.createElement('a');
    parser.href = uri;
    var name = parser.pathname;

    if (BASEPREFIX == null) {
      BASEPREFIX = name.split('/').slice(0, -1).join('/');
    }

    if (PORT == 443)
      host = 'wss://' + parser.host + '/ws/';
    else
      host = parser.host;

    if (face == null) {
      // Connect to the forwarder with a WebSocket.
      face = new Face({host: host, port: PORT});
    }

    // get BW Estimation for collecting stats
    var bandwidthEst = Math.round(this.player.abrManager_.bandwidthEstimator_.getBandwidthEstimate());

    var interest = new Interest(new Name(name));
    interest.setInterestLifetimeMilliseconds(1000);

    var statsObj = {};
    SegmentFetcher.fetch(face, interest, null,
      function(content) { // onCompvare
        var headers = {};
        var response = null;
        if (requestType < 4) { // manifest file
          response = shaka.net.HttpPluginUtils.makeResponse(headers,
              content.buf(), 200,
              uri, null, requestType);
        }
        else {
          shaka.log.debug('Uknown request type ' + requestType);
        };
        // send an Interest back for collecting stats
        var statsName = createStatsName(statsCode.DONE, name, startTime, host, bandwidthEst, statsObj);

        // create stats Interest
        var statsInterest = new Interest(statsName);
        statsInterest.setMustBeFresh(true);
        face.expressInterest(statsInterest, null, null, null, null, null);

        resolve(response);
      },
      function(errorCode, message) { // onError
        shaka.log.debug('Error ' + errorCode + ': ' + message);

        // send an Interest back for collecting stats
        var statsName = createStatsName(statsCode.ERROR, name, startTime, host, bandwidthEst, statsObj);

        // create stats Interest
        var statsInterest = new Interest(statsName);
        statsInterest.setMustBeFresh(true);
        face.expressInterest(statsInterest, null, null, null, null, null);
      },
      {pipeline: "cubic", maxRetriesOnTimeoutOrNack: 1000},
      statsObj);
  });

  return new shaka.util.AbortableOperation(
   promise,
   () => {
      abortStatus.canceled = true;
      return Promise.resolve();
    });
};

/**
 * @summary Create an Interest name for collecting statistical info
 *
 * @param statCode 1: DONE | 2: ERROR
 * @param name The file name
 * @param startTime The starting time of file downloading
 * @param host The URL of NFD instance we are connecting to
 * @param bandwidthEst An estimation of current BW
 */
function createStatsName(statCode, name, startTime, host, bandwidthEst, stats) {
  var stat = 'DONE'; /* every code except 2 means success */
  if (statCode === 2) {
    stat = 'ERROR';
  }
  else if (statCode !== 1) {
    shaka.log.debug('WARNING: Unrecognized statCode', statCode);
  }


  if (startupDelay === 0 && !isNaN(this.player.stats_.loadLatency)) {
    startupDelay = this.player.stats_.loadLatency;
  }

  if (this.player.stats_.stateHistory.length > 0) {
    var i = rebufferingArray.length > 0 ? rebufferingArray[rebufferingArray.length - 1] + 1 : 1;
    for ( ; i < this.player.stats_.stateHistory.length; ++i) {
      if (this.player.stats_.stateHistory[i].state === "buffering") {
        rebufferingArray.push(i);
      }
    }
  }

  var statsName = new Name(name.slice(1, BASEPREFIX.length) +
                           '/stats' + name.slice(BASEPREFIX.length))
                      .append('status=' + stat)
                      .append('hub=' + host.toString())
                      .append('ip=' + PUBLIC_IP_ADDRESS)
                      .append('estBw=' + bandwidthEst.toString())
                      .append('nRetransmissions=' + stats.nRetransmitted)
                      .append('nTimeouts=' + stats.nTimeouts)
                      .append('nNack=' + stats.nNacks)
                      .append('nSegments=' + stats.nSegments)
                      .append('delay=' + (Date.now() - startTime).toString())
                      .append('avgRtt=' + stats.avgRtt)
                      .append('avgJitter=' + stats.avgJitter)
                      .append('session=' + sessionNo)
                      .append('startupDelay=' + startupDelay)
                      .append('rebufferings=' + rebufferingArray.length);

  // append duration of bufferings
  for (i = 0; i < rebufferingArray.length; ++i) {
    statsName.append('bufferingDuration=' + this.player.stats_.stateHistory[rebufferingArray[i]].duration);
  }

  return statsName;
}

function registerPlugin() {
  shaka.net.NetworkingEngine.registerScheme('http', shaka.net.HttpNdnPlugin,
      shaka.net.NetworkingEngine.PluginPriority.PREFERRED);
  shaka.net.NetworkingEngine.registerScheme('https', shaka.net.HttpNdnPlugin,
      shaka.net.NetworkingEngine.PluginPriority.PREFERRED);
}

window.onload = registerPlugin();
