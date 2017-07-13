'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = logsView;
function logsView(node, _ref) {
  var results = _ref.results;

  var id = location.pathname.split('dashboard/').pop().replace(/-$/, '-?');

  raw('#output').innerHTML = results[id] ? results[id].html : 'No connected agent yet..';
}