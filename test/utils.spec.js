var fs = require('fs');
var utils = require('../lib/utils');

var DOWNLOADS_DIR = "downloads/";
var url = "https://d262ilb51hltx0.cloudfront.net/max/563/1*-uuCRCgbnGxovqngJRpa3A.png";

before(function() {
  
  

});

describe('utils', function() {

  it('makes sure the downloads directory is empty', function(done) {
    utils.cleanDownloads(0, function() {
      var files = fs.readdirSync(DOWNLOADS_DIR);
      setTimeout(function() {
        expect(files.length).to.equal(0);
        done();
      }, 200);
    });
  });

  it('downloads a file', function(done) {

    utils.downloadUrl({url: url}, function(err, item) {
      expect(err).to.not.exist;
      expect(item.filelength).to.equal(449662);
      expect(item.cache).to.equal(false);
      done();
    });

  });

  it('downloads file from cache', function(done) {

    utils.downloadUrl({url: url}, function(err, item) {
      expect(err).to.not.exist;
      expect(item.filelength).to.equal(449662);
      expect(item.cache).to.equal(true);
      done();
    });

  });

});
