var http = require('http')
	, urlLibrary = require('url')
  , request = require('request')
  , fs = require('fs')
  , crypto = require('crypto')
  , humanize = require('humanize')
  ;

var DOWNLOADS_DIR = "downloads/";
var FEEDS_DIR = "feeds/";
var MAX_DOWNLOADS = 5;
var CHECK_FILESIZE = false;

var cache = { headers: {}, files: {} };

var utils = {

  restoreFeed: function(filename) {
    if(!fs.existsSync(FEEDS_DIR+filename)) return null;
    return fs.readFileSync(FEEDS_DIR+filename, { encoding: 'utf8' });
  },

  saveFeed: function(filename, feed, cb) {
    fs.writeFile(FEEDS_DIR+filename, feed, function(err) {
      console.log(humanize.date("Y-m-d H:i:s")+" Feed saved to "+FEEDS_DIR+filename);
      if(cb) return cb(err, feed);
    });
  },

	unshorten: function(shorturl, callback) {
      try {
        url = urlLibrary.parse(shorturl);
      } catch(e) {
        console.log("Unable to parse url "+shorturl, e);
        return callback(e, shorturl);
      }
			http.request(
				{
					'method': 'HEAD',
					'host': url.host,
					'path': url.pathname
				},
				function(response) {
					var location = response.headers.location || url.href;
          callback(null, location);
					return;
				}
			).end();
		},

  // Download locally the file at the given url
  downloadUrl: function(fileurl, filepath, cb) {

    // If we have never seen this url, we first get its filesize via a HEAD request
    if(!cache.headers[fileurl]) {
      return request.head(fileurl, function(err, res) {
        if(err) return cb(err);
        if(res.statusCode != 200) return cb(new Error("Invalid response code " + res.statusCode));
        cache.headers[fileurl] = res.headers 
        return utils.downloadUrl(fileurl, filepath, cb);
      });
    }

    // If file has already been previously downloaded
    if(fs.existsSync(filepath)) {
      var filesize = fs.statSync(filepath).size;
      if(!CHECK_FILESIZE || filesize == cache.headers[fileurl]['content-length']) {
        // console.log("Getting file " + filepath + " from cache");
        return cb(null, filepath);
      }
      else {
        console.log("\""+filepath+"\" ("+humanize.filesize(filesize)+") does not match original size ("+humanize.filesize(cache.headers[fileurl]['content-length'])+")");
      }
    }

    // Otherwise we download it
    var urlObj = urlLibrary.parse(fileurl);
    console.log("utils.downloadUrl> Downloading " + urlObj.pathname.substr(urlObj.pathname.lastIndexOf('/')+1) + " from " + urlObj.hostname);
    var stream = request(fileurl);
    var fileStream = fs.createWriteStream(filepath);
    stream.pipe(fileStream);
    stream.on('end', function() {
      console.log("utils.downloadUrl> File downloaded to /" + filepath);
      cb(null, filepath); 
    });

    stream.on('response', function(res) {
      if(res.statusCode != 200) return this.emit('error', new Error("Invalid response code " + res.statusCode));
    });

    stream.on('error', cb);
    fileStream.on('error', cb);

  },

  cleanDownloads: function(subdir, max_downloads, cb) {
    cb = cb || function() {};

    var max_downloads = (typeof max_downloads != 'undefined') ? max_downloads : MAX_DOWNLOADS;
    var dir = DOWNLOADS_DIR+subdir
    var files = fs.readdirSync(dir);
    
    files.sort(function(a, b) {
                   return fs.statSync(dir + b).mtime.getTime() -
                          fs.statSync(dir + a).mtime.getTime();
               });

    if(files.length <= max_downloads) return cb(null);

    for(var i= max_downloads; i < files.length; i++) {
      console.log("Removing file "+dir+files[i]+ " modified "+(new Date(fs.statSync(dir+files[i]).mtime.getTime()).toString()));
      if(cache.files[dir+files[i]]) {
        delete cache.headers[cache.files[dir+files[i]].fileurl];
        delete cache.files[dir+files[i]];
      }
      fs.unlink(dir+files[i]);
    }
    cb(null);
  },

  // Scrape the html page to find out the download url of the video
  getDownloadUrlFromPage: function(videoPageUrl, callback) {
    var stream = request(videoPageUrl);

    var videoUrl = null;
    stream.on('data', function(data) {
      if(videoUrl) return;
      var chunk = data.toString();
      var matches = chunk.match(/.*downloadUrl&quot;:&quot;([^&]*)&quot;.*/);
      if(matches) {
        // stream.pause();
        videoUrl = matches[1].replace(/\\\//g,'/');
        callback(null, videoUrl);
      }
    });

    stream.on('error', function(e) {
      console.log("Error while getting the content of "+videoPageUrl, e);
      return callback(null, videoUrl);
    });

    stream.on('end', function() { 
      if(!videoUrl) {
        console.log("Download url not found in "+videoPageUrl);
        return callback(null, videoUrl);
      }
    });

  },

  // Download the video locally
  // @pre: item.guid
  // @post: item.downloadUrl
  downloadItem: function(subdir, item, callback) {

    var itemurl = "http://www.rtbf.be/video/embed?id="+item.guid;

    utils.getDownloadUrlFromPage(itemurl, function(err, url) {
      item.url = url;
      utils.unshorten(url, function(err, url) {
        item.unshortenUrl = url;

        var extension = url.substr(url.lastIndexOf('.'));
        var filepath = DOWNLOADS_DIR + subdir + item.guid + extension;

        utils.downloadUrl(url, filepath, function(err, filepath) {
          item.filepath = filepath;
          item.filesize = cache.headers[url]['content-length'];
          cache.files[filepath] = { url: url};
          callback(null, item);
        }); 
      });
    });

  }
}

module.exports = utils;
