var http = require('http')
	, urlLibrary = require('url')
  , request = require('request')
  , fs = require('fs')
  , crypto = require('crypto')
  ;

var DOWNLOADS_DIR = "downloads/";
var MAX_DOWNLOADS = 5;

var utils = {
	unshorten: function(item, callback) {
      try {
        url = urlLibrary.parse(item.url);
      } catch(e) {
        console.log("Unable to parse url "+item.url, e);
        return callback(e, item);
      }
			http.request(
				{
					'method': 'HEAD',
					'host': url.host,
					'path': url.pathname
				},
				function(response) {
					var location = response.headers.location || url.href;
          item.url = location;
          callback(null, item);
					return;
				}
			).end();
		},

  downloadUrl: function(item, callback) {

    var extension = item.url.substr(item.url.lastIndexOf('.'));
    var filepath = DOWNLOADS_DIR + item.guid + extension;


    // If file has already been previously downloaded
    if(fs.existsSync(filepath)) {
      item.filelength = fs.statSync(filepath).size;
      item.downloadUrl = '/' + filepath;
      item.cache = true;
      console.log("Getting file " + filepath + " from cache");
      return callback(null, item);
    }

    console.log("Downloading ",filepath);

    // Otherwise we download it
    item.cache = false;
    var stream = request(item.url);
    var fileStream = fs.createWriteStream(filepath);
    stream.pipe(fileStream);
    stream.on('end', function() {
      console.log("File downloaded to /" + filepath);
      item.downloadUrl = '/' + filepath; 
      callback(null, item); 
      utils.cleanDownloads();
    });

    stream.on('response', function(res) {
      if(res.statusCode != 200) return this.emit('error', new Error("Invalid response code " + res.statusCode));
      item.filelength = parseInt(res.headers['content-length'],10); 
    });

    stream.on('error', function(e) {
      callback(e);
    });

  },

  cleanDownloads: function(max_downloads, callback) {
    var max_downloads = (typeof max_downloads != 'undefined') ? max_downloads : MAX_DOWNLOADS;
    var files = fs.readdirSync(DOWNLOADS_DIR);
    
    files.sort(function(a, b) {
                   return fs.statSync(DOWNLOADS_DIR + b).mtime.getTime() -
                          fs.statSync(DOWNLOADS_DIR + a).mtime.getTime();
               });

    if(files.length > max_downloads) {
      for(var i= max_downloads; i < files.length; i++) {
        console.log("Removing file "+DOWNLOADS_DIR+files[i]+ " modified "+(new Date(fs.statSync(DOWNLOADS_DIR+files[i]).mtime.getTime()).toString()));
        fs.unlink(DOWNLOADS_DIR+files[i]);
      }
      if(callback) callback();
    }
  },

  getDownloadUrl: function(item, callback) {

    var url = "http://www.rtbf.be/video/embed?id="+item.guid;
    item.url = null;
    var stream = request(url);

    stream.on('data', function(data) {
      if(item.url) return;
      var chunk = data.toString();
      var matches = chunk.match(/.*downloadUrl&quot;:&quot;([^&]*)&quot;.*/);
      if(matches) {
        // stream.pause();
        var url = matches[1].replace(/\\\//g,'/');
        item.url = url;
        utils.unshorten(item, function(err, item) {
          utils.downloadUrl(item, callback); 
        });
      }
    });

    stream.on('error', function(e) {
      console.log("Error while getting the content of "+url, e);
      return callback(null, item);
    });

    stream.on('end', function() { 
      if(!item.url) {
        console.log("Download url not found in "+url);
        return callback(null, item);
      }
    });
  }
}

module.exports = utils;
