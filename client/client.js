(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var core   = require('rijs.core').default
  , data   = require('rijs.data').default
  , sync   = require('rijs.sync').default
  , ripple = sync(data(core()))
  , to = require('utilise/to')
  , all = require('utilise/all')
  , raw = require('utilise/raw')
  , socket = ripple.io
  , realConsole = window.console

ripple.io.on('reload', reload)
ripple.io.on('connect', function(){
  ripple.io.on('connect', reload)
})

ripple('results', { 
  stats: { running: true }
, suites: []
, html: 'Test in progress..'
})

window.onerror = function(message, url, linenumber){
  socket.emit('global err', message, url, linenumber)
}

;['log', 'info', 'warn', 'error', 'debug'].forEach(function(m){
  if (!window.console) return;
  var sup = window.console[m]
  window.console[m] = function(){
    var args = to.arr(arguments)
    socket.emit('console', m, args.map(function(d){
      return d
    }))
    sup.apply && sup.apply(realConsole, arguments)
  }
})

window.finish = function(){
  var stats = this.stats
  stats.running = false
  ripple('results', { 
    stats: stats
  , suites: all('#mocha-report > .suite').map(suite)
  , html: raw('#mocha').innerHTML
  })
}

function suite(s){
  return {
    name: raw('h1', s).textContent
  , total: '' + all('.test', s).length
  , failures: '' + all('.fail', s).length
  }
}

function reload() {
  location.reload()
}

function param(p){
  var candidate = window.location.search.split(p+'=').pop().split('&').shift().split('#').shift()
  return candidate != window.location.search ? candidate : ''
}
},{"rijs.core":3,"rijs.data":5,"rijs.sync":34,"utilise/all":6,"utilise/raw":27,"utilise/to":31}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = core;

var _emitterify = require('utilise/emitterify');

var _emitterify2 = _interopRequireDefault(_emitterify);

var _colorfill = require('utilise/colorfill');

var _colorfill2 = _interopRequireDefault(_colorfill);

var _chainable = require('utilise/chainable');

var _chainable2 = _interopRequireDefault(_chainable);

var _identity = require('utilise/identity');

var _identity2 = _interopRequireDefault(_identity);

var _rebind = require('utilise/rebind');

var _rebind2 = _interopRequireDefault(_rebind);

var _header = require('utilise/header');

var _header2 = _interopRequireDefault(_header);

var _values = require('utilise/values');

var _values2 = _interopRequireDefault(_values);

var _is = require('utilise/is');

var _is2 = _interopRequireDefault(_is);

var _to = require('utilise/to');

var _to2 = _interopRequireDefault(_to);

var _za = require('utilise/za');

var _za2 = _interopRequireDefault(_za);

var _text = require('./types/text');

var _text2 = _interopRequireDefault(_text);

/* istanbul ignore next */
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// -------------------------------------------
// API: Gets or sets a resource
// -------------------------------------------
// ripple('name')     - returns the resource body if it exists
// ripple('name')     - creates & returns resource if it doesn't exist
// ripple('name', {}) - creates & returns resource, with specified name and body
// ripple({ ... })    - creates & returns resource, with specified name, body and headers
// ripple.resources   - returns raw resources
// ripple.resource    - alias for ripple, returns ripple instead of resource for method chaining
// ripple.register    - alias for ripple
// ripple.on          - event listener for changes - all resources
// ripple('name').on  - event listener for changes - resource-specific

function core() {
  log('creating');

  var resources = {};
  ripple.resources = resources;
  ripple.resource = (0, _chainable2.default)(ripple);
  ripple.register = ripple;
  ripple.types = types();
  return (0, _emitterify2.default)(ripple);

  function ripple(name, body, headers) {
    return !name ? ripple : _is2.default.arr(name) ? name.map(ripple) : _is2.default.obj(name) && !name.name ? ripple : _is2.default.fn(name) && name.resources ? ripple((0, _values2.default)(name.resources)) : _is2.default.str(name) && !body && resources[name] ? resources[name].body : _is2.default.str(name) && !body && !resources[name] ? register(ripple)({ name: name }) : _is2.default.str(name) && body ? register(ripple)({ name: name, body: body, headers: headers }) : _is2.default.obj(name) && !_is2.default.arr(name) ? register(ripple)(name) : (err('could not find or create resource', name), false);
  }
}

function register(ripple) {
  return function (_ref) {
    var name = _ref.name;
    var body = _ref.body;
    var _ref$headers = _ref.headers;
    var headers = _ref$headers === undefined ? {} : _ref$headers;

    log('registering', name);
    var res = normalise(ripple)({ name: name, body: body, headers: headers }),
        type = !ripple.resources[name] ? 'load' : '';

    if (!res) return err('failed to register', name), false;
    ripple.resources[name] = res;
    ripple.emit('change', [ripple.resources[name], { type: type }]);
    return ripple.resources[name].body;
  };
}

function normalise(ripple) {
  return function (res) {
    if (!(0, _header2.default)('content-type')(res)) (0, _values2.default)(ripple.types).sort((0, _za2.default)('priority')).some(contentType(res));
    if (!(0, _header2.default)('content-type')(res)) return err('could not understand resource', res), false;
    return parse(ripple)(res);
  };
}

function parse(ripple) {
  return function (res) {
    var type = (0, _header2.default)('content-type')(res);
    if (!ripple.types[type]) return err('could not understand type', type), false;
    return (ripple.types[type].parse || _identity2.default)(res);
  };
}

function contentType(res) {
  return function (type) {
    return type.check(res) && (res.headers['content-type'] = type.header);
  };
}

function types() {
  return [_text2.default].reduce(_to2.default.obj('header'), 1);
}

var err = require('utilise/err')('[ri/core]'),
    log = require('utilise/log')('[ri/core]');
},{"./types/text":4,"utilise/chainable":7,"utilise/colorfill":9,"utilise/emitterify":13,"utilise/err":14,"utilise/header":18,"utilise/identity":19,"utilise/is":21,"utilise/log":24,"utilise/rebind":28,"utilise/to":31,"utilise/values":32,"utilise/za":33}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _includes = require('utilise/includes');

var _includes2 = _interopRequireDefault(_includes);

var _is = require('utilise/is');

var _is2 = _interopRequireDefault(_is);

/* istanbul ignore next */
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  header: 'text/plain',
  check: function check(res) {
    return !(0, _includes2.default)('.html')(res.name) && !(0, _includes2.default)('.css')(res.name) && _is2.default.str(res.body);
  }
};
},{"utilise/includes":20,"utilise/is":21}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = data;

var _emitterify = require('utilise/emitterify');

var _emitterify2 = _interopRequireDefault(_emitterify);

var _header = require('utilise/header');

var _header2 = _interopRequireDefault(_header);

var _extend = require('utilise/extend');

var _extend2 = _interopRequireDefault(_extend);

var _not = require('utilise/not');

var _not2 = _interopRequireDefault(_not);

var _is = require('utilise/is');

var _is2 = _interopRequireDefault(_is);

var _to = require('utilise/to');

var _to2 = _interopRequireDefault(_to);

/* istanbul ignore next */
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// -------------------------------------------
// Adds support for data resources
// -------------------------------------------
function data(ripple) {
  log('creating');
  ripple.on('change.data', trickle(ripple));
  ripple.types['application/data'] = {
    header: 'application/data',
    check: function check(res) {
      return _is2.default.obj(res.body) || !res.body ? true : false;
    },
    parse: function parse(res) {
      var existing = ripple.resources[res.name] || {};
      delete res.headers.listeners;
      (0, _extend2.default)(res.headers)(existing.headers);

      !res.body && (res.body = []);
      !res.body.on && (res.body = (0, _emitterify2.default)(res.body));
      res.body.on.change = res.headers.listeners = res.headers.listeners || [];
      res.body.on('change.bubble', function () {
        return ripple.emit('change', [res], (0, _not2.default)(_is2.default.in(['data'])));
      });

      return res;
    }
  };

  return ripple;
}

function trickle(ripple) {
  return function (res) {
    var args = [arguments[0].body, arguments[1]];
    return (0, _header2.default)('content-type', 'application/data')(res) && ripple.resources[res.name].body.emit('change', _to2.default.arr(args), (0, _not2.default)(_is2.default.in(['bubble'])));
  };
}

var log = require('utilise/log')('[ri/types/data]');
},{"utilise/emitterify":13,"utilise/extend":15,"utilise/header":18,"utilise/is":21,"utilise/log":24,"utilise/not":25,"utilise/to":31}],6:[function(require,module,exports){
var to = require('utilise/to')

module.exports = function all(selector, doc){
  var prefix = !doc && document.head.createShadowRoot ? 'html /deep/ ' : ''
  return to.arr((doc || document).querySelectorAll(prefix+selector))
}
},{"utilise/to":31}],7:[function(require,module,exports){
module.exports = function chainable(fn) {
  return function(){
    return fn.apply(this, arguments), fn
  }
}
},{}],8:[function(require,module,exports){
module.exports = typeof window != 'undefined'
},{}],9:[function(require,module,exports){
var client = require('utilise/client')
  , colors = !client && require('colors')
  , has = require('utilise/has')
  , is = require('utilise/is')

module.exports = colorfill()

function colorfill(){
  /* istanbul ignore next */
  ['red', 'green', 'bold', 'grey', 'strip'].forEach(function(color) {
    !is.str(String.prototype[color]) && Object.defineProperty(String.prototype, color, {
      get: function() {
        return String(this)
      } 
    })
  })
}


},{"colors":2,"utilise/client":8,"utilise/has":17,"utilise/is":21}],10:[function(require,module,exports){
module.exports = function copy(from, to){ 
  return function(d){ 
    return to[d] = from[d], d
  }
}
},{}],11:[function(require,module,exports){
var sel = require('utilise/sel')

module.exports = function datum(node){
  return sel(node).datum()
}
},{"utilise/sel":29}],12:[function(require,module,exports){
var has = require('utilise/has')

module.exports = function def(o, p, v, w){
  !has(o, p) && Object.defineProperty(o, p, { value: v, writable: w })
  return o[p]
}

},{"utilise/has":17}],13:[function(require,module,exports){
var err  = require('utilise/err')('[emitterify]')
  , keys = require('utilise/keys')
  , def  = require('utilise/def')
  , not  = require('utilise/not')
  , is   = require('utilise/is')
  
module.exports = function emitterify(body) {
  return def(body, 'on', on)
       , def(body, 'once', once)
       , def(body, 'emit', emit)
       , body

  function emit(type, param, filter) {
    var ns = type.split('.')[1]
      , id = type.split('.')[0]
      , li = body.on[id] || []
      , tt = li.length-1
      , pm = is.arr(param) ? param : [param || body]

    if (ns) return invoke(li, ns, pm), body

    for (var i = li.length; i >=0; i--)
      invoke(li, i, pm)

    keys(li)
      .filter(not(isFinite))
      .filter(filter || Boolean)
      .map(function(n){ return invoke(li, n, pm) })

    return body
  }

  function invoke(o, k, p){
    if (!o[k]) return
    var fn = o[k]
    o[k].once && (isFinite(k) ? o.splice(k, 1) : delete o[k])
    try { fn.apply(body, p) } catch(e) { err(e, e.stack)  }
   }

  function on(type, callback) {
    var ns = type.split('.')[1]
      , id = type.split('.')[0]

    body.on[id] = body.on[id] || []
    return !callback && !ns ? (body.on[id])
         : !callback &&  ns ? (body.on[id][ns])
         :  ns              ? (body.on[id][ns] = callback, body)
                            : (body.on[id].push(callback), body)
  }

  function once(type, callback){
    return callback.once = true, body.on(type, callback), body
  }
}
},{"utilise/def":12,"utilise/err":14,"utilise/is":21,"utilise/keys":23,"utilise/not":25}],14:[function(require,module,exports){
var owner = require('utilise/owner')
  , to = require('utilise/to')

module.exports = function err(prefix){
  return function(d){
    if (!owner.console || !console.error.apply) return d;
    var args = to.arr(arguments)
    args.unshift(prefix.red ? prefix.red : prefix)
    return console.error.apply(console, args), d
  }
}
},{"utilise/owner":26,"utilise/to":31}],15:[function(require,module,exports){
var is = require('utilise/is')
  , not = require('utilise/not')
  , keys = require('utilise/keys')
  , copy = require('utilise/copy')

module.exports = function extend(to){ 
  return function(from){
    keys(from)
      .filter(not(is.in(to)))
      .map(copy(from, to))

    return to
  }
}
},{"utilise/copy":10,"utilise/is":21,"utilise/keys":23,"utilise/not":25}],16:[function(require,module,exports){
var datum = require('utilise/datum')
  , key = require('utilise/key')

module.exports = from
from.parent = fromParent

function from(o){
  return function(k){
    return key(k)(o)
  }
}

function fromParent(k){
  return datum(this.parentNode)[k]
}
},{"utilise/datum":11,"utilise/key":22}],17:[function(require,module,exports){
module.exports = function has(o, k) {
  return k in o
}
},{}],18:[function(require,module,exports){
var has = require('utilise/has')

module.exports = function header(header, value) {
  var getter = arguments.length == 1
  return function(d){ 
    return !d                      ? null
         : !has(d, 'headers')      ? null
         : !has(d.headers, header) ? null
         : getter                  ? d['headers'][header]
                                   : d['headers'][header] == value
  }
}
},{"utilise/has":17}],19:[function(require,module,exports){
module.exports = function identity(d) {
  return d
}
},{}],20:[function(require,module,exports){
module.exports = function includes(pattern){
  return function(d){
    return d && d.indexOf && ~d.indexOf(pattern)
  }
}
},{}],21:[function(require,module,exports){
module.exports = is
is.fn     = isFunction
is.str    = isString
is.num    = isNumber
is.obj    = isObject
is.lit    = isLiteral
is.bol    = isBoolean
is.truthy = isTruthy
is.falsy  = isFalsy
is.arr    = isArray
is.null   = isNull
is.def    = isDef
is.in     = isIn

function is(v){
  return function(d){
    return d == v
  }
}

function isFunction(d) {
  return typeof d == 'function'
}

function isBoolean(d) {
  return typeof d == 'boolean'
}

function isString(d) {
  return typeof d == 'string'
}

function isNumber(d) {
  return typeof d == 'number'
}

function isObject(d) {
  return typeof d == 'object'
}

function isLiteral(d) {
  return typeof d == 'object' 
      && !(d instanceof Array)
}

function isTruthy(d) {
  return !!d == true
}

function isFalsy(d) {
  return !!d == false
}

function isArray(d) {
  return d instanceof Array
}

function isNull(d) {
  return d === null
}

function isDef(d) {
  return typeof d !== 'undefined'
}

function isIn(set) {
  return function(d){
    return !set ? false  
         : set.indexOf ? ~set.indexOf(d)
         : d in set
  }
}
},{}],22:[function(require,module,exports){
var is = require('utilise/is')
  , str = require('utilise/str')

module.exports = function key(k, v){ 
  var set = arguments.length > 1
    , keys = str(k).split('.')
    , root = keys.shift()

  return function deep(o){
    var masked = {}
    return !o ? undefined 
         : !k ? o
         : is.arr(k) ? (k.map(copy), masked)
         : o[k] || !keys.length ? (set ? ((o[k] = is.fn(v) ? v(o[k]) : v), o)
                                       :   o[k])
                                : (set ? (key(keys.join('.'), v)(o[root] ? o[root] : (o[root] = {})), o)
                                       : key(keys.join('.'))(o[root]))

    function copy(k){
      var val = key(k)(o)
      ;(val != undefined) && key(k, val)(masked)
    }
  }
}
},{"utilise/is":21,"utilise/str":30}],23:[function(require,module,exports){
module.exports = function keys(o) {
  return Object.keys(o || {})
}
},{}],24:[function(require,module,exports){
var is = require('utilise/is')
  , to = require('utilise/to')
  , owner = require('utilise/owner')

module.exports = function log(prefix){
  return function(d){
    if (!owner.console || !console.log.apply) return d;
    is.arr(arguments[2]) && (arguments[2] = arguments[2].length)
    var args = to.arr(arguments)
    args.unshift(prefix.grey ? prefix.grey : prefix)
    return console.log.apply(console, args), d
  }
}
},{"utilise/is":21,"utilise/owner":26,"utilise/to":31}],25:[function(require,module,exports){
module.exports = function not(fn){
  return function(){
    return !fn.apply(this, arguments)
  }
}
},{}],26:[function(require,module,exports){
(function (global){
module.exports = require('utilise/client') ? /* istanbul ignore next */ window : global
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"utilise/client":8}],27:[function(require,module,exports){
module.exports = function raw(selector, doc){
  var prefix = !doc && document.head.createShadowRoot ? 'html /deep/ ' : ''
  return (doc ? doc : document).querySelector(prefix+selector)
}
},{}],28:[function(require,module,exports){
module.exports = function(target, source) {
  var i = 1, n = arguments.length, method
  while (++i < n) target[method = arguments[i]] = rebind(target, source, source[method])
  return target
}

function rebind(target, source, method) {
  return function() {
    var value = method.apply(source, arguments)
    return value === source ? target : value
  }
}
},{}],29:[function(require,module,exports){
module.exports = function sel(el){
  return el.node ? el : d3.select(el)
}
},{}],30:[function(require,module,exports){
var is = require('utilise/is') 

module.exports = function str(d){
  return d === 0 ? '0'
       : !d ? ''
       : is.fn(d) ? '' + d
       : is.obj(d) ? JSON.stringify(d)
       : String(d)
}
},{"utilise/is":21}],31:[function(require,module,exports){
module.exports = { 
  arr: toArray
, obj: toObject
}

function toArray(d){
  return Array.prototype.slice.call(d, 0)
}

function toObject(d) {
  var by = 'id'
    , o = {}

  return arguments.length == 1 
    ? (by = d, reduce)
    : reduce.apply(this, arguments)

  function reduce(p,v,i){
    if (i === 0) p = {}
    p[v[by]] = v
    return p
  }
}
},{}],32:[function(require,module,exports){
var keys = require('utilise/keys')
  , from = require('utilise/from')

module.exports = function values(o) {
  return !o ? [] : keys(o).map(from(o))
}
},{"utilise/from":16,"utilise/keys":23}],33:[function(require,module,exports){
var key = require('utilise/key')

module.exports = function za(k) {
  return function(a, b){
    var ka = key(k)(a) || ''
      , kb = key(k)(b) || ''

    return ka > kb ? -1 
         : ka < kb ?  1 
                   :  0
  }
}

},{"utilise/key":22}],34:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sync;

var _identity = require('utilise/identity');

var _identity2 = _interopRequireDefault(_identity);

var _replace = require('utilise/replace');

var _replace2 = _interopRequireDefault(_replace);

var _prepend = require('utilise/prepend');

var _prepend2 = _interopRequireDefault(_prepend);

var _flatten = require('utilise/flatten');

var _flatten2 = _interopRequireDefault(_flatten);

var _values = require('utilise/values');

var _values2 = _interopRequireDefault(_values);

var _header = require('utilise/header');

var _header2 = _interopRequireDefault(_header);

var _client = require('utilise/client');

var _client2 = _interopRequireDefault(_client);

var _noop = require('utilise/noop');

var _noop2 = _interopRequireDefault(_noop);

var _keys = require('utilise/keys');

var _keys2 = _interopRequireDefault(_keys);

var _key = require('utilise/key');

var _key2 = _interopRequireDefault(_key);

var _str = require('utilise/str');

var _str2 = _interopRequireDefault(_str);

var _not = require('utilise/not');

var _not2 = _interopRequireDefault(_not);

var _by = require('utilise/by');

var _by2 = _interopRequireDefault(_by);

var _is = require('utilise/is');

var _is2 = _interopRequireDefault(_is);

var _jsondiffpatch = require('jsondiffpatch');

/* istanbul ignore next */
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// -------------------------------------------
// API: Synchronises resources between server/client
// -------------------------------------------
function sync(ripple, server) {
  log('creating');

  if (!_client2.default && !server) return;
  (0, _values2.default)(ripple.types).map(headers(ripple));
  ripple.sync = emit(ripple);
  ripple.io = io(server);
  ripple.on('change', function (res) {
    return emit(ripple)()(res.name);
  });
  ripple.io.on('change', silent(ripple));
  ripple.io.on('connection', function (s) {
    return s.on('change', change(ripple));
  });
  ripple.io.on('connection', function (s) {
    return emit(ripple)(s)();
  });
  ripple.io.use(setIP);
  return ripple;
}

function change(ripple) {
  return function (req) {
    log('receiving', req.name);

    var socket = this,
        res = ripple.resources[req.name],
        check = type(ripple)(req).from || _identity2.default;

    if (!res) return log('no resource', req.name);
    if (!check.call(this, req)) return debug('type skip', req.name);
    if (!_is2.default.obj(res.body)) return silent(ripple)(req);

    var to = (0, _header2.default)('proxy-to')(res) || _identity2.default,
        from = (0, _header2.default)('proxy-from')(res),
        body = to.call(socket, (0, _key2.default)('body')(res)),
        deltas = (0, _jsondiffpatch.diff)(body, req.body);

    if (_is2.default.arr(deltas)) return delta('') && res.body.emit('change');

    (0, _keys2.default)(deltas).reverse().filter((0, _not2.default)((0, _is2.default)('_t'))).map(paths(deltas)).reduce(_flatten2.default, []).map(delta).some(Boolean) && res.body.emit('change');

    function delta(k) {
      var d = (0, _key2.default)(k)(deltas),
          name = req.name
      // , body  = res.body
      ,
          index = k.replace(/(^|\.)_/g, '$1'),
          type = d.length == 1 ? 'push' : d.length == 2 ? 'update' : d[2] === 0 ? 'remove' : '',
          value = type == 'update' ? d[1] : d[0],
          next = types[type];

      if (!type) return false;
      if (!from || from.call(socket, value, body, index, type, name, next)) {
        !index ? silent(ripple)(req) : next(index, value, body, name, res);
        return true;
      }
    }
  };
}

function paths(base) {
  return function (k) {
    var d = (0, _key2.default)(k)(base);
    k = _is2.default.arr(k) ? k : [k];

    return _is2.default.arr(d) ? k.join('.') : (0, _keys2.default)(d).map((0, _prepend2.default)(k.join('.') + '.')).map(paths(base));
  };
}

function push(k, value, body, name) {
  var path = k.split('.'),
      tail = path.pop(),
      o = (0, _key2.default)(path.join('.'))(body) || body;

  _is2.default.arr(o) ? o.splice(tail, 0, value) : (0, _key2.default)(k, value)(body);
}

function remove(k, value, body, name) {
  var path = k.split('.'),
      tail = path.pop(),
      o = (0, _key2.default)(path.join('.'))(body) || body;

  _is2.default.arr(o) ? o.splice(tail, 1) : delete o[tail];
}

function update(k, value, body, name) {
  (0, _key2.default)(k, value)(body);
}

function headers(ripple) {
  return function (type) {
    var parse = type.parse || _noop2.default;
    type.parse = function (res) {
      if (_client2.default) return parse.apply(this, arguments), res;
      var existing = ripple.resources[res.name],
          from = (0, _header2.default)('proxy-from')(existing),
          to = (0, _header2.default)('proxy-to')(existing);

      res.headers['proxy-from'] = (0, _header2.default)('proxy-from')(res) || (0, _header2.default)('from')(res) || from;
      res.headers['proxy-to'] = (0, _header2.default)('proxy-to')(res) || (0, _header2.default)('to')(res) || to;
      return parse.apply(this, arguments), res;
    };
  };
}

function silent(ripple) {
  return function (res) {
    return res.headers.silent = true, ripple(res);
  };
}

function io(opts) {
  var r = !_client2.default ? require('socket.io')(opts.server || opts) : window.io ? window.io() : _is2.default.fn(require('socket.io-client')) ? require('socket.io-client')() : { on: _noop2.default, emit: _noop2.default };
  r.use = r.use || _noop2.default;
  return r;
}

// emit all or some resources, to all or some clients
function emit(ripple) {
  return function (socket) {
    return function (name) {
      if (arguments.length && !name) return;
      if (!name) return (0, _values2.default)(ripple.resources).map((0, _key2.default)('name')).map(emit(ripple)(socket)), ripple;

      var res = ripple.resources[name],
          sockets = _client2.default ? [ripple.io] : ripple.io.of('/').sockets,
          lgt = stats(sockets.length, name),
          silent = (0, _header2.default)('silent', true)(res);

      return silent ? delete res.headers.silent : !res ? log('no resource to emit: ', name) : _is2.default.str(socket) ? lgt(sockets.filter((0, _by2.default)('sessionID', socket)).map(to(ripple)(res))) : !socket ? lgt(sockets.map(to(ripple)(res))) : lgt([to(ripple)(res)(socket)]);
    };
  };
}

function to(ripple) {
  return function (res) {
    return function (socket) {
      var body = _is2.default.fn(res.body) ? '' + res.body : res.body,
          rep,
          fn = {
        type: type(ripple)(res).to || _identity2.default,
        res: res.headers['proxy-to'] || _identity2.default
      };

      body = fn.res.call(socket, body);
      if (!body) return false;

      rep = fn.type.call(socket, { name: res.name, body: body, headers: res.headers });
      if (!rep) return false;

      socket.emit('change', rep);
      return true;
    };
  };
}

function stats(total, name) {
  return function (results) {
    log((0, _str2.default)(results.filter(Boolean).length).green.bold + '/' + (0, _str2.default)(total).green, 'sending', name);
  };
}

function setIP(socket, next) {
  socket.ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  next();
}

function type(ripple) {
  return function (res) {
    return ripple.types[(0, _header2.default)('content-type')(res)];
  };
}

var log = require('utilise/log')('[ri/sync]'),
    err = require('utilise/err')('[ri/sync]'),
    debug = _noop2.default,
    types = { push: push, remove: remove, update: update };
},{"jsondiffpatch":2,"socket.io":2,"socket.io-client":2,"utilise/by":35,"utilise/client":36,"utilise/err":38,"utilise/flatten":39,"utilise/header":42,"utilise/identity":43,"utilise/is":44,"utilise/key":45,"utilise/keys":46,"utilise/log":47,"utilise/noop":48,"utilise/not":49,"utilise/prepend":51,"utilise/replace":52,"utilise/str":54,"utilise/values":56}],35:[function(require,module,exports){
var key = require('utilise/key')
  , is  = require('utilise/is')

module.exports = function by(k, v){
  var exists = arguments.length == 1
  return function(o){
    var d = key(k)(o)
    
    return d && v && d.toLowerCase && v.toLowerCase ? d.toLowerCase() === v.toLowerCase()
         : exists ? Boolean(d)
         : is.fn(v) ? v(d)
         : d == v
  }
}
},{"utilise/is":44,"utilise/key":45}],36:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"dup":8}],37:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11,"utilise/sel":53}],38:[function(require,module,exports){
arguments[4][14][0].apply(exports,arguments)
},{"dup":14,"utilise/owner":50,"utilise/to":55}],39:[function(require,module,exports){
var is = require('utilise/is')  

module.exports = function flatten(p,v){ 
  is.arr(v) && (v = v.reduce(flatten, []))
  return (p = p || []), p.concat(v) 
}

},{"utilise/is":44}],40:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16,"utilise/datum":37,"utilise/key":45}],41:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],42:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18,"utilise/has":41}],43:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],44:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"dup":21}],45:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22,"utilise/is":44,"utilise/str":54}],46:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],47:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24,"utilise/is":44,"utilise/owner":50,"utilise/to":55}],48:[function(require,module,exports){
module.exports = function noop(){}
},{}],49:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],50:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26,"utilise/client":36}],51:[function(require,module,exports){
module.exports = function prepend(v) {
  return function(d){
    return v+d
  }
}
},{}],52:[function(require,module,exports){
module.exports = function replace(from, to){
  return function(d){
    return d.replace(from, to)
  }
}
},{}],53:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],54:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"dup":30,"utilise/is":44}],55:[function(require,module,exports){
arguments[4][31][0].apply(exports,arguments)
},{"dup":31}],56:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32,"utilise/from":40,"utilise/keys":46}]},{},[1]);
