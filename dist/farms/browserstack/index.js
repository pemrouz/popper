'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _browsers = require('./browsers.json');

var _browsers2 = _interopRequireDefault(_browsers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = { browsers: _browsers2.default, connect: connect };


var err = require('utilise/err')('[popper][browserstack]');

function connect(wd) {
  var env = process.env,
      key = env.BROWSERSTACK_KEY,
      user = env.BROWSERSTACK_USERNAME,
      host = 'hub.browserstack.com';

  return !user || !key ? (err('Please provide your BrowserStack Credentials'), false) : wd.remote(host, 80, user, key);
}