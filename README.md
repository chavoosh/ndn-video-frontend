# Let NDN stream videos in browsers

This repository is part of [iViSA project](https://ivisa.named-data.net).
This is a simple webpage that allows the users to stream HLS/DASH packaged videos
over NDN. To enabe the browser to support NDN functionalities, the webpage loads
a group of JavaScript libraries in the browser.
In the backend, there must be an accessible NDN server (whether online or local) that serves HLS/DASH
packaged videos (see [Backend](#backend)).

For a quick test, simply open [index.html](index.html) file and open the video link to watch a
sample video over NDN. The html files are kept very simple to show the minimum requirements and
they can be safely used to develop your own html webpages.

The following JavaScript libraries are used in this project:
- [Shaka Player](https://github.com/google/shaka-player)
- [ndn-js](https://github.com/named-data/ndn-js)

# Backend
To run an NDN video fileserver visit [ndn-mongo-fileserver](https://github.com/chavoosh/ndn-mongo-fileserver).

# Reporting Bugs
To report any bugs or features use the project's [issue tracker](https://github.com/chavoosh/ndn-video-frontend/issues).

# License
ndn-video-frotend is an open source project licensed under the GPL version 3. See [COPYING.md](COPYING.md)
for more information.
