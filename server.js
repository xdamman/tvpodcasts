var fs = require("fs")
	, express = require("express")
  , logger = require("express-logger")
	, feedlib = require("./lib/feedlib")
  , utils = require("./lib/utils")
  , humanize = require('humanize')
  ;

var interval = 12*60; // Updating the feed every 12 minutes

var app = express()
	, feed = utils.restoreFeed();


var port = process.env.PORT || 12441;
app.set('port',port);

app.use(logger({path:'logs/access.log'}));


app.status = 'idle';
function updateFeed() {
  app.status = 'updating_feed';
	feedlib.generateFeed(function(rssfeed) {
    app.status = 'idle';
		feed = rssfeed;
	});
}

setInterval(function() {

  if(app.status == 'idle') 
    updateFeed();

}, interval*1000);

updateFeed();

app.get('/rtbfpodcast.xml', function(req, res){
	res.contentType("xml");
  res.send(feed);
});

app.get('/', function(req, res) {
	res.redirect("https://github.com/xdamman/rtbfpodcast");
});

app.get('/stop', function(req, res, next) {
  if(req.socket.remoteAddress == "127.0.0.1") {
    res.send("Shutting down server...\n");
    process.exit(0);
  }
  else return next();
});

app.use('/status', require('./lib/status'));
app.use('/downloads',express.static("downloads/"));
app.use('/img',express.static("img/"));

app.listen(port);
console.info("app listening on port "+port);
