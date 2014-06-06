var fs = require("fs")
	, express = require("express")
  , logger = require("express-logger")
	, feedlib = require("./lib/feedlib")
  , humanize = require('humanize')
  ;

var interval = 12*60; // Updating the feed every 12 minutes

var app = express()
	, feed;


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

app.use('/status', require('./lib/status'));
app.use('/downloads',express.static("downloads/"));
app.use('/img',express.static("img/"));

app.listen(port);
console.info("app listening on port "+port);
