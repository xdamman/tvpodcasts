# RTBF 19H30 Video Podcast for iTunes
This nodejs program creates an RSS feed for iTunes so that you can enjoy the RTBF 19H30 journal on your AppleTV, iPad, iPhone.

## How it works?
Every 15 minutes, it fetches the RSS feed of the latest RTBF 19h30 journal available and construct the url to the mp4 version of the video. It then creates the RSS feed compatible with iTunes.

## How to add the feed to iTunes?

In iTunes, click in the menu "Advanced", then "Subscribe to podcast..." and enter the following URL:

    http://rtbfpodcast.herokuapp.com/rtbfpodcast.xml

## How to run it locally?

    node server.js

Runs a server that listen on port 12441.
You can get the XML feed by opening your browser to:

    http://localhost:12441/rtbfpodcast.xml

