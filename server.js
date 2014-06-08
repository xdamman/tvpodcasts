var fs = require("fs")
	, express = require("express")
  , logger = require("express-logger")
  , utils = require("./lib/utils")
  , humanize = require('humanize')
  , package = require('./package.json')
  , async = require('async')
  ;

var FEEDS_UPDATE_INTERVAL = 12*60; // Updating the feed every 12 minutes

var app = express()

var rtbf = require('./providers/rtbf')(app);
var cplus = require('./providers/cplus')(app);

app.set('port', process.env.PORT || 12441);

app.use(logger({path:'logs/access.log'}));

app.use('/status', require('./lib/status'));
app.use('/downloads',express.static("downloads/"));
app.use('/feeds',express.static("feeds/"));
app.use('/img',express.static("img/"));


app.status = 'idle';
function updateFeeds() {
  if(app.status == 'idle') {
    app.status = 'updating_feed';
    async.parallel([rtbf.updateFeed, cplus.updateFeed], function(err, results) {
      app.status = 'idle';
    });
  }
};

updateFeeds();
setInterval(updateFeeds, FEEDS_UPDATE_INTERVAL * 1000);

app.get('/rtbfpodcast.xml', function(req, res){
	res.redirect('/feeds/rtbfpodcast.xml');
});

app.get('/', function(req, res) {
	res.redirect("https://github.com/xdamman/rtbfpodcast");
});

app.get('/stop', function(req, res, next) {
  if(req.socket.remoteAddress == "127.0.0.1") {
    res.send("Shutting down server...\n");
    process.exit(1);
  }
  else return next();
});

app.listen(app.set('port'));
console.info("app v"+package.version+" listening on port "+app.set('port'));
