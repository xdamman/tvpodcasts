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
var DOWNLOADS_DIR = "downloads/"; 

var FEED_HEADER = '<?xml version="1.0" encoding="UTF-8"?> \n\
                  <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">\n\
                  <channel> \n';


module.exports = function(server) {

  return function(options) {

    var self = this;

    this.feed = {
        name: options.feedname
      , query: options.query
      , title: options.title
      , description: options.description
      , category: options.category || "Society &amp; Culture" || "News &amp; Politics"
      , cover: options.cover || server.set('base_url')+'/img/'+options.feedname+'.jpg'
      , filter: (typeof options.filter == 'function') ? options.filter : function(item) { return true; }
    };

    this.updateFeed = function(cb) {

      if(!fs.existsSync(DOWNLOADS_DIR + 'cplus/' + self.feed.name)) {
        fs.mkdirSync(DOWNLOADS_DIR + 'cplus/' + self.feed.name);
      }

      var queryurl = "http://service.canal-plus.com/video/rest/search/cplus/"+encodeURIComponent(self.feed.query)+"?format=json";

      request(queryurl, {json: true}, function(err, res, body) {

        var i = 0
          , items = [];

        _.forEach(body, function(item) {

          if(!item.INFOS.PUBLICATION) {
            console.error("Invalid item -- missing date", item);
            return;
          }

          if(!self.feed.filter(item)) {
            return;
          }

          if(i++ >= MAX_ITEMS) return;

          var info = {
              id: item.ID
            , title: self.feed.title+" "+ item.INFOS.PUBLICATION.DATE // item.INFOS.TITRAGE.SOUS_TITRE
            , description: item.RUBRIQUAGE.CATEGORIE + " " + (self.feed.description || item.INFOS.DESCRIPTION)
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

      var xml = FEED_HEADER;

      xml += '<title>'+self.feed.title+'</title> \n\
              \t<language>fr-FR</language>\n\
              \t<itunes:author>@xdamman</itunes:author>\n\
              \t<itunes:image href="'+self.feed.cover+'" />\n\
              \t<itunes:subtitle>Video Podcast</itunes:subtitle>\n\
              \t<description>'+self.feed.description+'</description>\n\
              \t<itunes:category text="'+self.feed.category+'"/>\n\
              \t<link>'+server.set('base_url')+'/feeds/cplus/'+self.feed.name+'.xml</link>\n';

      for(var i=0;i<items.length;i++) {
        var item = items[i];
        if(!item || !item.filepath) {
          console.log("Invalid item: ", item);
          continue;
        }

        var pubDate = moment(item.pubDate,"DD/MM/YYYY HH:mm").format('ddd, DD MMM YYYY HH:mm:ss ZZ');
        var feeditem = '<item> \n\
                        \t<title>'+item.title+'</title> \n\
                        \t<enclosure url="'+server.set('base_url')+'/'+item.filepath+'" length="'+item.filesize+'" type="video/mpeg"/> \n\
                        \t<pubDate>'+pubDate+'</pubDate> \n\
                        \t<description>'+item.description+'</description> \n\
                        \t<itunes:image href="'+item.thumbnail+'" /> \n\
                        \t<guid>'+server.set('base_url')+'/'+item.filepath+'</guid> \n\
                        </item>\n';

        xml += feeditem;
      }

      xml += '</channel></rss>';

      utils.saveFeed('cplus/'+self.feed.name+'.xml', xml, cb);

      return xml;

    };

    var download = function(item, cb) {

      item.filepath = DOWNLOADS_DIR+"cplus/"+self.feed.name+"/"+item.id+'.mp4';

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
        utils.cleanDownloads('cplus/'+self.feed.name+'/', MAX_ITEMS);
        return cb(null, item);
      });

    };
    
  }

};
