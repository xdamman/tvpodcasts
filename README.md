# TV PODCASTS 

This nodejs server downloads videos from public websites of TV channels and turn them into Video Podcasts compatible with iTunes so that you can enjoy them on your AppleTV, iPad, iPhone.

## Current shows

- [be-FR] RTBF Journal Télévisé de 19h30 [[iTunes link](https://itunes.apple.com/us/podcast/journal-19h30-la-rtbf-video/id885999509)]
- [fr-FR] Canal Plus - Zapping

## How to add the feed to iTunes?

In iTunes, in the "Files" menu, click on "Subscribe to podcast..." and enter one of the following URL:

    http://tvpodcasts.xdamman.com/feeds/rtbfpodcast.xml
    http://tvpodcasts.xdamman.com/feeds/zapping.xml

## How to run it locally?

The show "Zapping" requires `avconv`. Please make sure that you have installed it first on your machine. On a mac: `brew install libav`, on Ubuntu please [follow these instructions](https://gist.github.com/faleev/3435377).

Then you can 
	
	git clone https://github.com/xdamman/tvpodcasts.git;
	cd tvpodcasts;
	npm install;
    PORT=12441 npm start;

This will uns a server that listen on port 12441.
You can get the XML feed by opening your browser to:

    http://localhost:12441/feeds/rtbfpodcast.xml
    http://localhost:12441/feeds/zapping.xml

