// URL of the feed you want to parse
var MAX_ITEMS = 2;
var DOWNLOADS_DIR = "downloads/";
var FEEDS_DIR = "feeds/";

var sys = require('sys')
  , fs = require('fs')
  , mkdirp = require('mkdirp')
	, FeedParser = require("feedparser")
	, async = require('async')
  , utils = require('../lib/utils')
  , request = require('request')
  , moment = require('moment')
	;

module.exports = function(settings) {

  return function(feed) {

    var FEED_HEADER = '<?xml version="1.0" encoding="UTF-8"?> \n\
                      <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">\n\
                      <channel> \n\
                      \t<title>'+feed.title+'</title> \n\
                      \t<language>fr-be</language>\n\
                      \t<itunes:author>@xdamman</itunes:author>\n\
                      \t<itunes:image href="'+settings.base_url+'/img/'+feed.name+'.jpg" />\n\
                      \t<itunes:subtitle>JT Video Podcast</itunes:subtitle>\n\
                      \t<description>Retrouvez tous les jours le journal télévisé de la Radio Télévision Belge Francophone (RTBF) sur votre AppleTV, iPad ou iPhone.</description>\n\
                      \t<itunes:category text="News &amp; Politics"/>\n\
                      \t<itunes:new-feed-url>'+settings.base_url+'/'+FEEDS_DIR+'rtbf/'+feed.name+'.xml</itunes:new-feed-url>\n\
                      \t<link>'+settings.base_url+'/'+FEEDS_DIR+'rtbf/'+feed.name+'.xml</link>\n';

    var start_time = new Date();

    this.init = (function() {
      mkdirp(DOWNLOADS_DIR + 'rtbf/' + feed.name);
      mkdirp(FEEDS_DIR + 'rtbf/');
    })();

    var updateFeed = function(cb) {

      var pages = []
        , parser = new FeedParser();

      start_time = new Date();

      console.log(start_time+": Updating RSS feed");

      var items = [];
      var req = request(feed.url);

      req.on('response', function (res) {
        if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
        this.pipe(parser);
      });

      req.on('error', function (error) {
        console.error("Unable to download ", feed.url);
      });

      parser.on('error', function(error) {
        console.error("Unable to parse ", feed.url);
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

      parser.on("end",function() {
        async.map(items, function(item, done) {
          utils.downloadItem('rtbf/'+feed.name+'/', item, done);
        },  function(err, items) {
          if(err) { console.error(err); }

          console.log("all " + items.length + " videos downloaded");
          utils.cleanDownloads('rtbf/'+feed.name+'/', MAX_ITEMS);

          generateFeed(items, cb);
        });
      });
    };

    var generateFeed = function(items, cb) {

      var feedxml = FEED_HEADER;

      for(var i=0;i<items.length;i++) {
        var item = items[i];
        if(!item || !item.filepath) {
          console.log("Invalid item: ", item);
          continue;
        }

        var d = new Date(item.pubDate);
        var feeditem = '<item> \n\
                        \t<title>'+d.getDate()+'/'+(d.getMonth()+1)+' '+item.title+'</title> \n\
                        \t<enclosure url="'+settings.base_url+'/'+item.filepath+'" length="'+item.filesize+'" type="video/mpeg"/> \n\
                        \t<pubDate>'+item.pubDate+'</pubDate> \n\
                        \t<guid>'+settings.base_url+'/'+item.filepath+'</guid> \n\
                        </item>\n';

        feedxml += feeditem;
      }

      feedxml += '</channel></rss>';
      done = true;
      var timediff = (new Date) - start_time;

      console.log("\t"+items.length+" RSS items processed in "+moment.duration(timediff).humanize());

      utils.saveFeed('rtbf/'+feed.name+'.xml',feedxml, cb);

    }

    return {
      updateFeed: updateFeed
    };
  };
};
