'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _browsers = require('./browsers.json');

var _browsers2 = _interopRequireDefault(_browsers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = { browsers: _browsers2.default, connect: connect, status: status, parse: parse };


var err = require('utilise/err')('[popper][saucelabs]'),
    log = require('utilise/log')('[popper][saucelabs]');

function connect(wd) {
  var env = process.env,
      key = env.SAUCE_ACCESS_KEY,
      user = env.SAUCE_USERNAME,
      host = 'ondemand.saucelabs.com';

  return !user || !key ? (err('Please provide your SauceLabs Credentials'), false) : wd.remote(host, 80, user, key);
}

function status(browser, platform) {
  browser.vm.sauceJobStatus(browser.passed, function (e) {
    e ? err(e) : log('status updated', platform.uid.bold, str(browser.passed)[browser.passed ? 'green' : 'red'], str(browser.build).grey);
    browser.vm.quit();
  });
}

function parse(opts) {
  return extend(opts)({
    'tunnel-identifier': process.env.TRAVIS_JOB_NUMBER,
    build: process.env.TRAVIS_BUILD_NUMBER || ~~(Math.random() * 100000000),
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY
  });
}