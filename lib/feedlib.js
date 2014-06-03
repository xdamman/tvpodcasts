// URL of the feed you want to parse
var feed_url = "http://rss.rtbf.be/media/rss/programmes/journal_t__l__vis___19h30.xml";

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

	console.log(start_time+": Updating RSS feed");

	var feed = '<?xml version="1.0" encoding="UTF-8"?> \n\
	<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">\n\
	<channel> \n\
	\t<title>Journal 19h30 de la RTBF Video Podcast (Belgique)</title> \n\
	\t<language>fr-be</language>\n\
	\t<itunes:author>@xdamman</itunes:author>\n\
	\t<itunes:image href="http://ds.static.rtbf.be/media/video/thumbnails/137/154/3/d1405157dcb55b6d0500f794072aa22b/large.jpg" />\n\
	\t<itunes:subtitle>Video Podcast non officiel</itunes:subtitle>\n\
	\t<description>Retrouvez tous les jours le journal de 19h30 de la Radio Télévision Belge Francophone (RTBF) sur votre AppleTV, iPad ou iPhone.</description>\n\
	\t<itunes:category text="News &amp; Politics"/>\n\
	\t<link>http://rtbfpodcast.heroku.com/rtbfpodcast.xml</link>\n';

	var items = [];
  var req = request(feed_url);

  req.on('response', function (res) {
    if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
    this.pipe(parser);
  });

  req.on('error', function (error) {
    console.error("Unable to download ", feed_url);
  });

  parser.on('error', function(error) {
    console.error("Unable to parse ", feed_url);
  });

  parser.on('readable', function() {
    var stream = this
      , item;

    while (item = stream.read()) {
      process(item);
    }
  });

  var process = function(item) {

		var d = new Date(item.pubDate);
		var date = (d.getDate() < 10) ? '0'+d.getDate() : d.getDate();
    var month = d.getMonth()+1;
    if(month<10) month = "0"+month;
		var ts = date+''+month+d.getFullYear();
		ts+="1930";
		
    var matches = item.guid.match(/\?id=([0-9]+)/);
    var guid = matches[1];

    var page = {
          pubDate: item.pubDate
        , title: item.title
        , link: item.link
        , guid: guid
      };

    items.push(page);

	};

	parser.on("end",function() {
    
    async.map(items, utils.getDownloadUrl, function(err, items) {

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
                        \t<enclosure url="'+item.videoLink+'"	length="100000000" type="video/mpeg"/> \n\
                        \t<pubDate>'+item.pubDate+'</pubDate> \n\
                        </item>\n';

        feed += feeditem;
      }

      feed += '</channel></rss>';
      var timediff = Math.round(((new Date()).getTime()-start_time.getTime())/1000);

      console.log("\t"+items.length+" RSS items processed in "+timediff+"s");
      fn(feed)
    });

	});
}

exports.generateFeed = generateFeed;
