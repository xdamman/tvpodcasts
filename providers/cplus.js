var request = require('request')
  , fs = require('fs')
  , async = require('async')
  , _ = require('underscore')
  , moment = require('moment')
  , spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , utils = require('../lib/utils')
  , humanize = require('humanize')
  ;

var LOGS_FILE = "./logs/avconv.log";
var MAX_ITEMS = 10;
var DOWNLOADS_DIR = "downloads/"; 
var TMP_DIR = "/tmp/"; 

var FEED_HEADER = '<?xml version="1.0" encoding="UTF-8"?> \n\
                  <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">\n\
                  <channel> \n';


module.exports = function(settings) {

  return function(options) {

    var self = this;

    this.feed = {
        name: options.feedname
      , query: options.query
      , title: options.title
      , description: options.description
      , category: options.category || "Society &amp; Culture" || "News &amp; Politics"
      , cover: options.cover || settings.base_url+'/img/'+options.feedname+'.jpg'
      , website: options.website
      , max_items: options.max_items || MAX_ITEMS
      , filter: (typeof options.filter == 'function') ? options.filter : function(item) { return true; }
    };

    this.init = (function() {
      if(!fs.existsSync(DOWNLOADS_DIR + 'cplus')) {
        fs.mkdirSync(DOWNLOADS_DIR + 'cplus');
      }

      if(!fs.existsSync(DOWNLOADS_DIR + 'cplus/' + self.feed.name)) {
        fs.mkdirSync(DOWNLOADS_DIR + 'cplus/' + self.feed.name);
      }
    })();

    this.getBestStream = function(m3u8, cb) {

      request(m3u8, function(err, res, body) {
        if(err) return cb(err);
        var lines = body.split('\n');
        var streamurl;
        for(var i=0;i<lines.length;i++) {
          if(lines[i].substr(0,4)=='http') streamurl = lines[i];
        }
        if(!streamurl) return cb(new Error("Invalid m3u8: "+m3ua));
        return cb(null, streamurl);
      });

    };

    this.getLastVideoId = function(cb) {

      var stream = request(self.feed.website);
      var videoId;
      stream.on('data', function(data) {
        var html = data.toString();
        if(!/videoId="([0-9]{6,12})"/.test(html)) return;
        var matches = html.match(/videoId="([0-9]{6,12})"/i);
        cb(null, parseInt(matches[1], 10));
        stream.destroy();
      });

      stream.on('error', cb);
      stream.on('response', function(res) {
        if(res.statusCode != 200) return this.emit('error', new Error("Invalid response code "+res.statusCode));
      });

    };

    this.getLastItems = function(cb) {

      self.getLastVideoId(function(err, id) {

        if(!id) return cb(new Error("Invalid videoId"));

        var queryurl = "http://service.canal-plus.com/video/rest/getVideosLiees/cplus/"+id+"?format=json";

        request(queryurl, {json: true}, function(err, res, body) {

          if(err) return cb(err);

          var i = 0
            , items = [];

          _.forEach(body, function(item) {

            if(!(item && item.INFOS && item.INFOS.PUBLICATION)) {
              console.error("Invalid item -- missing date", item);
              return;
            }

            if(!self.feed.filter(item)) {
              return;
            }

            if(i++ >= self.feed.max_items) return;

            var info = {
                id: item.ID
              , title: item.RUBRIQUAGE.CATEGORIE + " " + item.INFOS.PUBLICATION.DATE // item.INFOS.TITRAGE.SOUS_TITRE
              , description: self.feed.description || item.INFOS.DESCRIPTION
              , thumbnail: item.MEDIA.IMAGES.GRAND
              , video: item.MEDIA.VIDEOS.HLS
              , pubDate: item.INFOS.PUBLICATION.DATE+" "+item.INFOS.PUBLICATION.HEURE
            };

            items.push(info);
          });

          cb(null, items);

        });
      });
    },

    this.updateFeed = function(cb) {

      self.getLastItems(function(err, items) { 
        async.forEachLimit(items, 2, download, function(err, results) {
          if(err) return cb(err);
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
              \t<link>'+settings.base_url+'/feeds/cplus/'+self.feed.name+'.xml</link>\n';

      for(var i=0;i<items.length;i++) {
        var item = items[i];
        if(!(item && item.filepath && item.filesize)) {
          console.log("Invalid item: ", item);
          continue;
        }

        var pubDate = moment(item.pubDate,"DD/MM/YYYY HH:mm").format('ddd, DD MMM YYYY HH:mm:ss ZZ');
        var feeditem = '<item> \n\
                        \t<title>'+item.title+'</title> \n\
                        \t<enclosure url="'+settings.base_url+'/'+item.filepath+'" length="'+item.filesize+'" type="video/mpeg"/> \n\
                        \t<pubDate>'+pubDate+'</pubDate> \n\
                        \t<description>'+item.description+'</description> \n\
                        \t<itunes:image href="'+item.thumbnail+'" /> \n\
                        \t<guid>'+settings.base_url+'/'+item.filepath+'</guid> \n\
                        </item>\n';

        xml += feeditem;
      }

      xml += '</channel></rss>';

      utils.saveFeed('cplus/'+self.feed.name+'.xml', xml, cb);

      return xml;

    };

    var download = function(item, cb) {

      item.filepath = DOWNLOADS_DIR+"cplus/"+self.feed.name+"/"+item.id+'.mp4';
      item.tmpfilepath = TMP_DIR+self.feed.name+"-"+item.id+'.mp4';

      if(fs.existsSync(item.filepath)) {
        // console.log("Getting "+item.filepath+" from cache");
        item.filesize = fs.statSync(item.filepath).size;
        return cb(null, item);
      }

      self.getBestStream(item.video, function(err, streamurl) {
        if(err) return cb(err);

        item.video = streamurl;
        console.log(humanize.date("Y-m-d H:i:s")+" Downloading "+item.video+" to "+item.tmpfilepath);

        var start_time = new Date;

        var avconv = spawn('avconv',['-i',item.video,item.tmpfilepath]);

        var logs = fs.createWriteStream(LOGS_FILE, { flags: 'a' });
        avconv.stdout.pipe(logs);
        avconv.stderr.pipe(logs);

        avconv.on('exit', function(code) {
          if(code != 0) {
            var err = "Error downloading "+item.video;
            console.error(err);
            return cb(new Error(err));
          } 
          console.log(humanize.date("Y-m-d H:i:s")+" Moving "+item.tmpfilepath+" to "+item.filepath);
          exec("mv "+item.tmpfilepath+" "+item.filepath, function(err, stdout, stderr) {
            var duration = (new Date) - start_time;
            console.log(item.filepath+" downloaded successfully in "+moment.duration(duration).humanize());
            item.filesize = fs.statSync(item.filepath).size;
            utils.cleanDownloads('cplus/'+self.feed.name+'/', self.feed.max_items);
            return cb(null, item);
          });
        });
      });
    };
  }
};
