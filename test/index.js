var express = require('express')
  , fs = require('fs')
  ;

expect = require('chai').expect;
server = express();
server.set('base_url','http://localhost:12441');

_ = require('underscore');


if(!fs.existsSync('downloads/test')) {
  fs.mkdirSync('downloads/test');
}
