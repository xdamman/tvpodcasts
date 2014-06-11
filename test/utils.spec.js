var fs = require('fs');
var utils = require('../lib/utils');

var DOWNLOADS_DIR = "downloads/";
var url = "https://www.google.com/images/srpr/logo11w.png";

describe('utils', function() {

  it('makes sure the downloads directory is empty', function(done) {
    utils.cleanDownloads('test/', 0, function(err) {
      var files = fs.readdirSync(DOWNLOADS_DIR+'test/');
      setTimeout(function() {
        expect(files.length).to.equal(0);
        done();
      }, 200);
    });
  });

  it('downloads a file', function(done) {

    var filepath = DOWNLOADS_DIR+'test/'+'testimagefile.png';
    utils.downloadUrl(url, filepath, function(err, filepath) {
      expect(err).to.not.exist;
      expect(fs.statSync(filepath).size).to.equal(14022);
      done();
    });

  });

});
