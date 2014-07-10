# TV PODCASTS 

This nodejs server downloads videos from public websites of TV channels and turn them into Video Podcasts compatible with iTunes so that you can enjoy them on your AppleTV, iPad, iPhone.

## Current shows

- [be-FR] RTBF Journal Télévisé de 19h30 [[iTunes link](https://itunes.apple.com/us/podcast/journal-19h30-la-rtbf-video/id885999509)]
- [fr-FR] Canal Plus - Zapping

## How to run it locally?

The show "Zapping" requires `ffmpeg`. Please make sure that you have installed it first on your machine. On a mac: `brew install libav`, on Ubuntu please [follow these instructions](https://gist.github.com/xdamman/e4f713c8cd1a389a5917).

Then you can proceed with the following commands:
	
	git clone https://github.com/xdamman/tvpodcasts.git;
	cd tvpodcasts;
	npm install;
    PORT=12441 npm start;

This will start a server that listens on port 12441.
You can get the XML feed by opening your browser to:

    http://localhost:12441/feeds/rtbfpodcast.xml
    http://localhost:12441/feeds/zapping.xml

## How to add the feeds to iTunes?

In iTunes, in the "Files" menu, click on "Subscribe to podcast..." and enter one of the following URL:

    http://localhost:12441/feeds/rtbfpodcast.xml
