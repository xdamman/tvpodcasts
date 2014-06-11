var fs = require("fs")
	, express = require("express")
  , logger = require("express-logger")
  , utils = require("./lib/utils")
  , humanize = require('humanize')
  , package = require('./package.json')
  , async = require('async')
  , nodalytics = require('nodalytics')
  , program = require('commander')
  , exec = require('child_process').exec
  ;

var AVAILABLE_FEEDS = ['zapping','guignols','petitjournal','rtbfpodcast'];
var FEEDS_UPDATE_INTERVAL = 12*60; // Updating the feed every 12 minutes

program
  .version(package.version)
  .option('-f, --feeds <feeds>', 'comma separated list of feeds to process, e.g.: zapping,guignols', AVAILABLE_FEEDS.join(','))
  .parse(process.argv);

if(typeof program.feeds == 'string') { 
  program.feeds = program.feeds.replace(/ /g,'').split(',');
}
else {
  program.feeds = AVAILABLE_FEEDS; 
}

var server = express()

server.set('port', process.env.PORT || 12441);

server.use(logger({path:'logs/access.log'}));
server.use(nodalytics('UA-45923462-3'));

server.use('/status', require('./lib/status'));
server.use('/downloads',express.static("downloads/"));
server.use('/feeds',express.static("feeds/"));
server.use('/img',express.static("img/"));

server.status = {};

/*
 * forking update feed
 */
function updateFeed(feedname, cb) {

  if(AVAILABLE_FEEDS.indexOf(feedname) == -1) {
    console.error("Invalid feed - "+feedname+" not in " + AVAILABLE_FEEDS);
    return cb(null);
  }

  server.status[feedname] = server.status[feedname] || {};

  if(server.status[feedname].status == 'updating_feed') {
    console.log(feedname+" still running -- skipping execution");
    return cb(null);
  }

  var cmd = "./bin/update_feed "+feedname+" 1>>logs/"+feedname+".out.log 2>>logs/"+feedname+".err.log";
  console.log(humanize.date("Y-m-d H:i:s")+" - "+"forking update_feed "+feedname); 
  server.status[feedname].status = 'updating_feed'; 

  server.status[feedname].last_run = new Date;
  exec(cmd, function(err, stdout, stderr) {
    if(err) console.error("Unable to update "+feedname+" feed -- see logs/"+feedname+".err.log for details", err);
    server.status[feedname].status = 'idle'; 
    return cb(null, stdout);
  });
}

function updateFeeds() {
  async.forEach(program.feeds, updateFeed, function(err, results) {
    if(err) {
      console.error("Error in updating the feeds: ", err);
    }
    console.log("All feeds executed successfully");
  });
};

/*
 * Scheduler
 */
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

if(!program.feed) {
  server.listen(server.set('port'));
  console.info(package.name + " server v"+package.version+" listening on port "+server.set('port'));
}
