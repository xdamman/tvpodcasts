var fs = require("fs")
	, express = require("express")
  , logger = require("express-logger")
  , utils = require("./lib/utils")
  , humanize = require('humanize')
  , package = require('./package.json')
  , async = require('async')
  , nodalytics = require('nodalytics')
  ;

var FEEDS_UPDATE_INTERVAL = 12*60; // Updating the feed every 12 minutes

var server = express()

server.set('port', process.env.PORT || 12441);
server.set('base_url', process.env.BASE_URL || "http://localhost:"+server.set('port'));

var rtbf = require('./providers/rtbf')(server);
var CplusProvider = require('./providers/cplus')(server);

var zappingFeed = new CplusProvider({
    feedname: "zapping"
  , title: "ザッピング"
  , description: "No description"
  , website: 'http://www.canalplus.fr/c-infos-documentaires/pid1830-c-zapping.html'
});
var guignolsFeed = new CplusProvider({
    feedname: "guignols"
  , title: "ホーン情報"
  , description: "No description"
  , website: 'http://www.canalplus.fr/c-divertissement/pid1784-c-les-guignols.html'
  , filter: function(item) { return item.RUBRIQUAGE.CATEGORIE.match(/SEMAINE|QUOTIDIEN/); }
});

var petitjournalFeed = new CplusProvider({
    feedname: "petitjournal"
  , title: "小さな新聞"
  , description: "No description"
  , website: 'http://www.canalplus.fr/c-divertissement/c-le-petit-journal/pid6515-l-emission.html'
  , max_items: 3
});

server.use(logger({path:'logs/access.log'}));
server.use(nodalytics('UA-45923462-3'));

server.use('/status', require('./lib/status'));
server.use('/downloads',express.static("downloads/"));
server.use('/feeds',express.static("feeds/"));
server.use('/img',express.static("img/"));


server.status = 'idle';
function updateFeeds() {
  if(server.status == 'idle') {
    server.status = 'updating_feed';
    async.parallel(
      [rtbf.updateFeed, zappingFeed.updateFeed, guignolsFeed.updateFeed, petitjournalFeed.updateFeed]
    , function(err, results) {
      server.status = 'idle';
    });
  }
};

updateFeeds();
setInterval(updateFeeds, FEEDS_UPDATE_INTERVAL * 1000);

server.get('/rtbfpodcast.xml', function(req, res){
	res.sendfile('feeds/rtbfpodcast.xml');
});

server.get('/', function(req, res) {
	res.redirect("https://github.com/xdamman/rtbfpodcast");
});

server.get('/robots.txt', function(req, res) {
  res.sendfile('robots.txt');
});

server.get('/stop', function(req, res, next) {
  if(req.socket.remoteAddress == "127.0.0.1") {
    res.send("Shutting down server...\n");
    process.exit(1);
  }
  else return next();
});

server.listen(server.set('port'));
console.info(package.name + " server v"+package.version+" listening on port "+server.set('port'));
