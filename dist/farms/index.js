'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _browserstack = require('./browserstack');

var _browserstack2 = _interopRequireDefault(_browserstack);

var _saucelabs = require('./saucelabs');

var _saucelabs2 = _interopRequireDefault(_saucelabs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = { browserstack: _browserstack2.default, saucelabs: _saucelabs2.default };