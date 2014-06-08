var request = require('request')
  , fs = require('fs')
  , async = require('async')
  , _ = require('underscore')
  , moment = require('moment')
  , spawn = require('child_process').spawn
  , utils = require('../lib/utils')
  ;

var LOGS_FILE = "./logs/avconv.log";
var MAX_ITEMS = 10;

var query = "http://service.canal-plus.com/video/rest/search/cplus/zapping?format=json";

module.exports = function(server) {

  var FEED_HEADER = '<?xml version="1.0" encoding="UTF-8"?> \n\
                    <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">\n\
                    <channel> \n\
                    \t<title>Le Zapping - Canal Plus (France)</title> \n\
                    \t<language>fr-FR</language>\n\
                    \t<itunes:author>@xdamman</itunes:author>\n\
                    \t<itunes:image href="'+server.set('base_url')+'/img/zapping.jpg" />\n\
                    \t<itunes:subtitle>Video Podcast</itunes:subtitle>\n\
                    \t<description>Retrouvez tous les jours le meilleur et le pire de la television francaise sur votre AppleTV, iPad ou iPhone.</description>\n\
                    \t<itunes:category text="News &amp; Politics"/>\n\
                    \t<link>'+server.set('base_url')+'/feeds/zapping.xml</link>\n';

  var updateFeed = function(cb) {

    request(query, {json: true}, function(err, res, body) {

      var i = 0
        , items = [];

      _.forEach(body, function(item) {

        if(i++ >= MAX_ITEMS) return;
        if(item.RUBRIQUAGE.RUBRIQUE!='ZAPPING') return;

        if(!item.INFOS.PUBLICATION) {
          console.error("Invalid item -- missing date", item);
          return;
        }

        var info = {
            id: item.ID
          , title: item.INFOS.TITRAGE.TITRE+" "+item.INFOS.TITRAGE.SOUS_TITRE
          , description: item.INFOS.DESCRIPTION
          , thumbnail: item.MEDIA.IMAGES.GRAND
          , video: item.MEDIA.VIDEOS.HLS
          , pubDate: item.INFOS.PUBLICATION.DATE+" "+item.INFOS.PUBLICATION.HEURE
        };

        items.push(info);
      });

      async.forEachLimit(items, 2, download, function(err, results) {
        console.log(items.length+ " videos downloaded");
        generateFeed(items, cb);
      });

    });

  };

  var generateFeed = function(items, cb) {
    
    var feed = FEED_HEADER;

    for(var i=0;i<items.length;i++) {
      var item = items[i];
      if(!item || !item.filepath) {
        console.log("Invalid item: ", item);
        continue;
      }

      var d = new Date(item.pubDate);
      var feeditem = '<item> \n\
                      \t<title>'+item.title+'</title> \n\
                      \t<enclosure url="'+server.set('base_url')+'/'+item.filepath+'" length="'+item.filesize+'" type="video/mpeg"/> \n\
                      \t<pubDate>'+item.pubDate+'</pubDate> \n\
                      \t<guid>'+server.set('base_url')+'/'+item.filepath+'</guid> \n\
                      </item>\n';

      feed += feeditem;
    }

    feed += '</channel></rss>';

    utils.saveFeed('zapping.xml', feed, cb);

    return feed;

  };

  var download = function(item, cb) {

    item.filepath = "downloads/cplus/"+item.id+'.mp4';

    if(fs.existsSync(item.filepath)) {
      console.log("Getting "+item.filepath+" from cache");
      item.filesize = fs.statSync(item.filepath).size;
      return cb(null, item);
    }

    item.video = item.video.replace('/master.m3u8','/index_3_av.m3u8');
    console.log("Downloading "+item.video+" to "+item.filepath);


    var start_time = new Date;

    var avconv = spawn('avconv',['-i',item.video,item.filepath]);

    var logs = fs.createWriteStream(LOGS_FILE, { flags: 'a' });
    avconv.stdout.pipe(logs);
    avconv.stderr.pipe(logs);

    avconv.on('exit', function(code) {
      if(code != 0) {
        var err = "Error downloading "+item.video;
        console.error(err);
        return cb(new Error(err));
      } 
      var duration = (new Date) - start_time;
      console.log(item.filepath+" downloaded successfully in "+moment.duration(duration).humanize());
      item.filesize = fs.statSync(item.filepath).size;
      utils.cleanDownloads('cplus/');
      return cb(null, item);
    });

  };

  return { updateFeed: updateFeed };
  
}
