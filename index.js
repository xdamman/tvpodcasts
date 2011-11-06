var fs = require("fs")
	, express = require("express")
	, feedlib = require("./lib/feedlib");

var interval = 60; // Updating the feed every 15 minutes

var app = express.createServer(
						express.logger()
					)
	, feed;

setInterval(function() {
	var date = new Date();
	feedlib.generateFeed(function(rssfeed) {
		feed = rssfeed;
	});
}, interval*1000);

app.get('/rtbfpodcast.xml', function(req, res){
	res.contentType("xml");
  res.send(feed);
});

app.get('/', function(req, res) {
	res.redirect("http://github.com/xdamman/rtbfpodcast");
});

app.listen(12441);
console.info("app listening on port 12441");
