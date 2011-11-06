// URL of the feed you want to parse
var feed_url = "http://rss.rtbf.be/media/rss/programmes/jt_19h30.xml"

var sys = require('sys')
	, jsdom = require("jsdom")
	, FeedParser = require("feedparser")
	, urlLibrary = require('url')
	, async = require('async')
	, http = require('http')
	;

var pages = [],
		parser = new FeedParser();

unshorten = function(url, callback) {
		url = urlLibrary.parse(url);
		http.request(
			{
				'method': 'HEAD',
				'host': url.host,
				'path': url.pathname
			},
			function(response) {
				var location = response.headers.location || response.statusCode || url.href;
				(callback || console.log)(location);
				return;
			}
		).end();
	}

var feed = '<?xml version="1.0" encoding="UTF-8"?> \n\
<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">\n\
<channel> \n\
\t<title>Journal 19h30 de la RTBF Video Podcast (Belgique)</title> \n\
\t<language>fr-be</language>\n\
\t<itunes:author>RTBF</itunes:author>\n\
\t<itunes:image href="http://ds.static.rtbf.be/media/video/thumbnails/137/154/3/d1405157dcb55b6d0500f794072aa22b/large.jpg" />\n\
\t<itunes:subtitle>Video Podcast non officiel hacké pour vous par @xdamman</itunes:subtitle>\n\
\t<description>Retrouvez tous les jours le journal de 19h30 de la Radio Télévision Belge Francophone (RTBF) sur votre AppleTV, iPad ou iPhone.</description>\n\
\t<itunes:category text="News &amp; Politics"/>\n\
\t<link>http://thinkornot.com/hacks/rtbfpodcast.xml</link>\n';

var items = [];

parser.on("article", function(item) {

	var d = new Date(item.pubDate);
	var date = (d.getDate() < 10) ? '0'+d.getDate() : d.getDate();
	var ts = date+''+(d.getMonth()+1)+d.getFullYear();
	ts+="1930";
	
	var videoLink = "http://podvideo.prd.rtbf.be/redirect/rtbf_vod/folder-3218/mp4-435/info__jt_"+ts+"__"+ts+".mp4";

	var page = {
				pubDate: item.pubDate
			, title: item.title
			, link: item.link
			, mp4: videoLink
		};

		items.push(page);

});

parserEnded = false;
parser.on("end",function() {

	if(parserEnded) return;
	parserEnded = true;

	async.forEachSeries(items, function(item,callback) {
		unshorten(item.mp4,function(url) {
			if(url==404) return callback(null);
			var d = new Date(item.pubDate);
			var feeditem = '<item> \n\
\t<title>'+d.getDate()+'/'+(d.getMonth()+1)+' '+item.title+'</title> \n\
\t<enclosure url="'+url+'"	length="100000000" type="video/mpeg"/> \n\
\t<pubDate>'+item.pubDate+'</pubDate> \n\
</item>\n';

			feed += feeditem;
			callback(null);
			});

	}, function() {
	feed += '</channel></rss>';
	console.info(feed);
	});
});

parser.parseFile(feed_url);


var parsePage = function(url) {

	// Count all of the links from the nodejs build page

	jsdom.env(url, [
		'http://code.jquery.com/jquery-1.5.min.js'
	],
	function(errors, window) {
		console.log("there have been", window.$("a").length, "nodejs releases!");
		var $ = window.$;
		console.log("There are " + $("div.rtbfPlayer").length+ " divs");
		var player = $("div.rtbfPlayer");
		console.log("Player: ",player.text());
	});

}
