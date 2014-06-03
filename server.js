var fs = require("fs")
	, express = require("express")
  , logger = require("express-logger")
	, feedlib = require("./lib/feedlib");

var interval = 15*60; // Updating the feed every 15 minutes

var app = express()
	, feed;

app.use(logger({path:'logs/access.log'}));

function updateFeed() {
	feedlib.generateFeed(function(rssfeed) {
		feed = rssfeed;
	});
}

setInterval(function() {
	var date = new Date();
	updateFeed();
}, interval*1000);

updateFeed();

app.get('/rtbfpodcast.xml', function(req, res){
	res.contentType("xml");
  res.send(feed);
});

app.get('/', function(req, res) {
	res.redirect("http://github.com/xdamman/rtbfpodcast");
});

app.listen(12441);
console.info("app listening on port 12441");
