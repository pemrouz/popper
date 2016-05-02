'use strict';

var _rijs = require('rijs.core');

var _rijs2 = _interopRequireDefault(_rijs);

var _rijs3 = require('rijs.data');

var _rijs4 = _interopRequireDefault(_rijs3);

var _rijs5 = require('rijs.sync');

var _rijs6 = _interopRequireDefault(_rijs5);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ripple = (0, _rijs6.default)((0, _rijs4.default)((0, _rijs2.default)())),
    all = require('utilise/all'),
    raw = require('utilise/raw'),
    to = require('utilise/to'),
    con = window.console;

// reload on force reload
ripple.io.on('reload', reload);

// after first connect, reload on reconnect
ripple.io.on('connect', function (d) {
  return ripple.io.on('connect', reload);
});

// send tests-starting signal
ripple('results', {
  stats: { running: true },
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
    var args = to.arr(arguments);
    ripple.io.emit('console', m, args.map(function (d) {
      return d;
    }));
    sup.apply && sup.apply(con, arguments);
  };
});

// send final results back
window.finish = function () {
  var stats = this.stats;
  stats.running = false;
  ripple('results', {
    stats: stats,
    suites: all('#mocha-report > .suite').map(suite),
    html: raw('#mocha').innerHTML
  });
};

function suite(s) {
  return {
    name: raw('h1', s).textContent,
    total: '' + all('.test', s).length,
    failures: '' + all('.fail', s).length
  };
}

function reload() {
  location.reload();
}