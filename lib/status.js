var os = require('os')
  , exec = require('child_process').exec
  , async = require('async')
  , package = require('../package.json')
  , humanize = require('humanize')
  , started_at = humanize.time()
  ;

var connections = {}
  , swap;

module.exports = function(req, res, next) {

    var server = req.app;

    async.parallel([
      function(done) {
        exec('netstat -an | grep ESTABLISHED | grep :'+server.set('port')+' | wc -l', function(e, res) {
          connections[server.set('port')] = parseInt(res,10);
          done();
        });
      },
      function(done) {
        exec('netstat -an | grep ESTABLISHED | grep :22 | wc -l', function(e, res) {
          connections[22] = parseInt(res,10);
          done();
        });
      },
      function(done) {
        exec('vmstat -SM -s | grep "used swap" | sed -E "s/[^0-9]*([0-9]{1,8}).*/\1/"', function(e, res) {
          swap = parseInt(res,10);
          done();
        });
      }], function(e) {
        res.send({
          server: {
            env        : process.env.NODE_ENV,
            version    : package.version, 
            started    : humanize.relativeTime(started_at),
            status     : server.status || 'up',
            feeds      : server.feeds
          },
          node       : {
            version   : process.version,
            memoryUsage: Math.round(process.memoryUsage().rss / 1024 / 1024)+"M",
            uptime     : process.uptime()
          },
          system    : {
            hostname   : os.hostname(),
            connections: connections,
            loadavg    : os.loadavg(),
            freeMemory : Math.round(os.freemem()/1024/1024)+"M",
            swap       : swap
          }
        });
    });
};
