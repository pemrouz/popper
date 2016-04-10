'use strict';

var _debounce = require('utilise/debounce');

var _debounce2 = _interopRequireDefault(_debounce);

var _escape = require('utilise/escape');

var _escape2 = _interopRequireDefault(_escape);

var _noop = require('utilise/noop');

var _noop2 = _interopRequireDefault(_noop);

var _raw = require('utilise/raw');

var _raw2 = _interopRequireDefault(_raw);

var _to = require('utilise/to');

var _to2 = _interopRequireDefault(_to);

var _rijs = require('rijs.core');

var _rijs2 = _interopRequireDefault(_rijs);

var _rijs3 = require('rijs.data');

var _rijs4 = _interopRequireDefault(_rijs3);

var _rijs5 = require('rijs.sync');

var _rijs6 = _interopRequireDefault(_rijs5);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ripple = (0, _rijs6.default)((0, _rijs4.default)((0, _rijs2.default)())),
    con = window.console,
    log = con ? Function.prototype.bind.call(con.log, con) : _noop2.default;

var html = '',
    running = true,
    failures = 0,
    passes = 0,
    tests = 0,
    name = 'All Tests',
    output = (0, _raw2.default)('pre');

// reload on force reload
ripple.io.on('reload', reload);

// after first connect, reload on reconnect
ripple.io.on('connect', function (d) {
  return ripple.io.on('connect', reload);
});

// send tests-starting signal
ripple('results', {
  stats: { running: running },
  suites: [],
  html: 'Test in progress..'
});

// proxy errors back to terminal
window.onerror = function (message, url, linenumber) {
  return ripple.io.emit('global err', message, url, linenumber);
}

// proxy console logs back to terminal
;['log', 'info', 'warn', 'error', 'debug'].map(function (m) {
  if (!con || !con[m]) return; // ie
  var sup = Function.prototype.bind.call(con[m], con);
  window.console[m] = function () {
    var args = _to2.default.arr(arguments);
    ripple.io.emit('console', m, args.map(function (d) {
      return d;
    }));
    sup.apply && sup.apply(con, arguments);
  };
});

// stream results back
var update = (0, _debounce2.default)(500)(function () {
  var stats = { running: running, tests: tests, passes: passes, failures: failures },
      suites = [{ name: name, failures: failures, total: tests }];

  output.innerHTML = html;
  ripple('results', { stats: stats, suites: suites, html: html });
})

// listen on log
;(window.console = window.console || {}).log = function () {
  var line = _to2.default.arr(arguments).join(' ');
  html += (0, _escape2.default)(line) + '\n';

  if (-1 === includes('# tests')(line)) running = false;
  if (-1 === includes('ok ')(line)) {
    passes++;tests++;
  }
  if (-1 === includes('not ok ')(line)) {
    failures++;tests++;
  }

  if (line.match(/^(?!.*\[ri\/)/)) update();
  log.apply(console, arguments);
};

function reload() {
  location.reload();
}