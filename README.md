# Let NDN stream videos in browsers

This repository is part of [iViSA project](https://ivisa.named-data.net).
Assuming there is an accessible NDN server (either online or local) that can serve files of
an HLS/Dash packaged videos, this frontend web resources allow you to run watch those videos
over NDN protocol in a browser.

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
