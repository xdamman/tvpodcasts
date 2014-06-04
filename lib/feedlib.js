// URL of the feed you want to parse
var FEED_URL = "http://rss.rtbf.be/media/rss/programmes/journal_t__l__vis___19h30.xml";
var MAX_ITEMS = 5;
var BASE_URL = "http://rtbfpodcast.xdamman.com";

var FEED_HEADER = '<?xml version="1.0" encoding="UTF-8"?> \n\
                  <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">\n\
                  <channel> \n\
                  \t<title>Journal 19h30 de la RTBF Video Podcast (Belgique)</title> \n\
                  \t<language>fr-be</language>\n\
                  \t<itunes:author>@xdamman</itunes:author>\n\
                  \t<itunes:image href="http://ds1.ds.static.rtbf.be/media/video/thumbnails/143/587/3/53f9bb3c8fde322f19f465f97baccda9/source.jpg" />\n\
                  \t<itunes:subtitle>Video Podcast</itunes:subtitle>\n\
                  \t<description>Retrouvez tous les jours le journal de 19h30 de la Radio Télévision Belge Francophone (RTBF) sur votre AppleTV, iPad ou iPhone.</description>\n\
                  \t<itunes:category text="News &amp; Politics"/>\n\
                  \t<link>'+BASE_URL+'/rtbfpodcast.xml</link>\n';

var sys = require('sys')
	, FeedParser = require("feedparser")
	, async = require('async')
  , utils = require('./utils')
  , request = require('request')
	;

var generateFeed = function(fn) {

	var pages = []
		, parser = new FeedParser()
		, start_time = new Date();

  var feed = FEED_HEADER;

	console.log(start_time+": Updating RSS feed");

	var items = [];
  var req = request(FEED_URL);

  req.on('response', function (res) {
    if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
    this.pipe(parser);
  });

  req.on('error', function (error) {
    console.error("Unable to download ", FEED_URL);
  });

  parser.on('error', function(error) {
    console.error("Unable to parse ", FEED_URL);
  });

  parser.on('readable', function() {
    var stream = this
      , item;

    while (item = stream.read()) {
      process(item);
    }
  });

  var process = function(item) {

    if(!item || !item.guid) return;
    if(items.length == MAX_ITEMS) return;

		item.pubDate = (new Date(item.pubDate)).toUTCString();
		
    var matches = item.guid.match(/\?id=([0-9]+)/);
    var guid = matches[1];

    console.log("Processing " + item.guid+ " "+item.title + " " + item.pubDate);

    var page = {
          pubDate: item.pubDate
        , title: item.title
        , link: item.link
        , guid: guid
      };

    items.push(page);

	};

  var done = false;

	parser.on("end",function() {

    console.log("parser end");

    if(done) return;

    console.log("Running async on "+items.length+" items");

    async.map(items, utils.getDownloadUrl, function(err, items) {

      console.log("async done");

      if(err) { console.error(err); }

      for(var i=0;i<items.length;i++) {
        var item = items[i];
        if(!item) {
          console.log("Invalid item: ", item);
          continue;
        }
        var d = new Date(item.pubDate);
        var feeditem = '<item> \n\
                        \t<title>'+d.getDate()+'/'+(d.getMonth()+1)+' '+item.title+'</title> \n\
                        \t<enclosure url="'+BASE_URL+item.downloadUrl+'"	length="'+item.filelength+'" type="video/mpeg"/> \n\
                        \t<pubDate>'+item.pubDate+'</pubDate> \n\
                        \t<guid>'+BASE_URL+item.downloadUrl+'</guid> \n\
                        </item>\n';

        feed += feeditem;
      }

      feed += '</channel></rss>';
      done = true;
      var timediff = Math.round(((new Date()).getTime()-start_time.getTime())/1000);

      console.log("\t"+items.length+" RSS items processed in "+timediff+"s");
      fn(feed)
    });

	});
}

exports.generateFeed = generateFeed;
