var http = require('http')
	, urlLibrary = require('url')
  , request = require('request')
  ;

var utils = {
	unshorten: function(item, callback) {
      try {
        url = urlLibrary.parse(item.videoLink);
      } catch(e) {
        console.log("Unable to parse url "+item.videoLink, e);
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
          item.videoLink = location;
          callback(null, item);
					return;
				}
			).end();
		},

  getDownloadUrl: function(item, callback) {

    var url = "http://www.rtbf.be/video/embed?id="+item.guid;
    item.videoLink = null;
    var stream = request(url);

    stream.on('data', function(data) {
      if(item.videoLink) return;
      var chunk = data.toString();
      var matches = chunk.match(/.*downloadUrl&quot;:&quot;([^&]*)&quot;.*/);
      if(matches) {
        // stream.pause();
        var videoLink = matches[1].replace(/\\\//g,'/');
        item.videoLink = videoLink;
        return utils.unshorten(item, callback);
      }
    });

    stream.on('error', function(e) {
      console.log("Error while getting the content of "+url, e);
      return callback(null, item);
    });

    stream.on('end', function() { 
      if(!item.videoLink) {
        console.log("Download url not found in "+url);
        return callback(null, item);
      }
    });
  }
}

module.exports = utils;
