var CplusProvider = require('../providers/cplus')(server);
var zappingFeed = new CplusProvider({
    feedname: "zapping"
  , title: "ザッピング"
  , description: "No description"
  , max_items: 5
  , website: 'http://www.canalplus.fr/c-infos-documentaires/pid1830-c-zapping.html'
});

describe("cplus", function() {

  it("provider has an updateFeed method", function() {
    expect(typeof zappingFeed.updateFeed).to.equal('function');
  });

  it("get the latest video id for a show", function(done) {
    zappingFeed.getLastVideoId(function(err, id) {
      expect(err).to.not.exist;
      expect(id).to.exist;
      expect(id).to.be.a.number;
      done();
    });
  });

  it("fails if the website is 404", function(done) {

    var feed = new CplusProvider({feedname:'error',website:'http://google.com/404'});
    feed.getLastVideoId(function(err, res) {
      expect(err).to.exist;
      done();
    });

  });

  it("Get best stream from m3u8", function(done) {

    var m3u8 = "http://us-cplus-aka.canal-plus.com/i/1405/LES_GUIGNOLS_QUOTIDIEN_140529_AUTO_24681_169_video_,L,H,HD,.mp4.csmil/master.m3u8";

    zappingFeed.getBestStream(m3u8, function(err, streamurl) {
      expect(err).to.not.exist;
      expect(streamurl).to.equal("http://us-cplus-aka.canal-plus.com/i/1405/LES_GUIGNOLS_QUOTIDIEN_140529_AUTO_24681_169_video_,L,H,HD,.mp4.csmil/index_2_av.m3u8");
      done();

    });

  });

  it("Get latest items", function(done) {

    var requiredAttributes = ['title','description','pubDate','thumbnail','video'];

    zappingFeed.getLastItems(function(err, items) {
      expect(err).to.not.exist;
      expect(items.length).to.equal(5);
      _.forEach(items, function(item) {
        // console.log(item);
        _.forEach(requiredAttributes, function(attr) {
          expect(item).to.have.property(attr);
        });
      });
      done();
    });

  });

});
