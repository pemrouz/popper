(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var core   = require('rijs.core')
  , data   = require('rijs.data')
  , sync   = require('rijs.sync')
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
},{"rijs.core":3,"rijs.data":57,"rijs.sync":90,"utilise/all":145,"utilise/raw":150,"utilise/to":151}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
"use strict";

/* istanbul ignore next */
var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

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

module.exports = core;

function core() {
  log("creating");

  var resources = {};
  ripple.resources = resources;
  ripple.resource = chainable(ripple);
  ripple.register = ripple;
  ripple.types = types();
  return emitterify(ripple);

  function ripple(name, body, headers) {
    return is.arr(name) ? name.map(ripple) : is.str(name) && !body && resources[name] ? resources[name].body : is.str(name) && !body && !resources[name] ? register(ripple)({ name: name }) : is.str(name) && body ? register(ripple)({ name: name, body: body, headers: headers }) : is.obj(name) && !is.arr(name) ? register(ripple)(name) : (err("could not find or create resource", name), false);
  }
}

function register(ripple) {
  return function (_ref) {
    var name = _ref.name;
    var body = _ref.body;
    var _ref$headers = _ref.headers;
    var headers = _ref$headers === undefined ? {} : _ref$headers;

    if (!name) return err("cannot register nameless resource");
    log("registering", name);
    var res = normalise(ripple)({ name: name, body: body, headers: headers });

    if (!res) return (err("failed to register", name), false);
    ripple.resources[name] = res;
    ripple.emit("change", [ripple.resources[name]]);
    return ripple.resources[name].body;
  };
}

function normalise(ripple) {
  return function (res) {
    if (!header("content-type")(res)) values(ripple.types).some(contentType(res));
    if (!header("content-type")(res)) return (err("could not understand", res), false);
    return parse(ripple)(res);
  };
}

function parse(ripple) {
  return function (res) {
    return ((ripple.types[header("content-type")(res)] || {}).parse || identity)(res);
  };
}

function contentType(res) {
  return function (type) {
    return type.check(res) && (res.headers["content-type"] = type.header);
  };
}

function types() {
  return objectify([text], "header");
}

var emitterify = _interopRequire(require("utilise/emitterify"));

var colorfill = _interopRequire(require("utilise/colorfill"));

var chainable = _interopRequire(require("utilise/chainable"));

var objectify = _interopRequire(require("utilise/objectify"));

var identity = _interopRequire(require("utilise/identity"));

var rebind = _interopRequire(require("utilise/rebind"));

var header = _interopRequire(require("utilise/header"));

var values = _interopRequire(require("utilise/values"));

var err = _interopRequire(require("utilise/err"));

var log = _interopRequire(require("utilise/log"));

var is = _interopRequire(require("utilise/is"));

var text = _interopRequire(require("./types/text"));

err = err("[ri/core]");
log = log("[ri/core]");
},{"./types/text":4,"utilise/chainable":5,"utilise/colorfill":6,"utilise/emitterify":7,"utilise/err":8,"utilise/header":9,"utilise/identity":10,"utilise/is":12,"utilise/log":13,"utilise/objectify":54,"utilise/rebind":55,"utilise/values":56}],4:[function(require,module,exports){
"use strict";

/* istanbul ignore next */
var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

module.exports = {
  header: "text/plain",
  check: function check(res) {
    return !includes(".html")(res.name) && !includes(".css")(res.name) && is.str(res.body);
  }
};

var includes = _interopRequire(require("utilise/includes"));

var is = _interopRequire(require("utilise/is"));
},{"utilise/includes":11,"utilise/is":12}],5:[function(require,module,exports){
module.exports = require('chainable')
},{"chainable":14}],6:[function(require,module,exports){
module.exports = require('colorfill')
},{"colorfill":15}],7:[function(require,module,exports){
module.exports = require('emitterify')
},{"emitterify":19}],8:[function(require,module,exports){
module.exports = require('err')
},{"err":29}],9:[function(require,module,exports){
module.exports = require('header')
},{"header":33}],10:[function(require,module,exports){
module.exports = require('identity')
},{"identity":35}],11:[function(require,module,exports){
module.exports = require('includes')
},{"includes":36}],12:[function(require,module,exports){
module.exports = require('is')
},{"is":37}],13:[function(require,module,exports){
module.exports = require('log')
},{"log":38}],14:[function(require,module,exports){
module.exports = function chainable(fn) {
  return function(){
    return fn.apply(this, arguments), fn
  }
}
},{}],15:[function(require,module,exports){
var client = require('client')
  , colors = !client && require('colors')
  , has = require('has')
  , is = require('is')

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


},{"client":16,"colors":2,"has":17,"is":18}],16:[function(require,module,exports){
module.exports = typeof window != 'undefined'
},{}],17:[function(require,module,exports){
module.exports = function has(o, k) {
  return k in o
}
},{}],18:[function(require,module,exports){
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
    return  set.indexOf 
         ? ~set.indexOf(d)
         :  d in set
  }
}
},{}],19:[function(require,module,exports){
var err  = require('err')('[emitterify]')
  , keys = require('keys')
  , def  = require('def')
  , not  = require('not')
  , is   = require('is')
  
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
    try { o[k].apply(body, p) } catch(e) { err(e, e.stack)  }
    o[k].once && (isFinite(k) ? o.splice(k, 1) : delete o[k])
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
},{"def":20,"err":22,"is":26,"keys":27,"not":28}],20:[function(require,module,exports){
var has = require('has')

module.exports = function def(o, p, v, w){
  !has(o, p) && Object.defineProperty(o, p, { value: v, writable: w })
  return o[p]
}

},{"has":21}],21:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],22:[function(require,module,exports){
var owner = require('owner')
  , to = require('to')

module.exports = function err(prefix){
  return function(d){
    if (!owner.console || !console.error.apply) return d;
    var args = to.arr(arguments)
    args.unshift(prefix.red ? prefix.red : prefix)
    return console.error.apply(console, args), d
  }
}
},{"owner":23,"to":25}],23:[function(require,module,exports){
(function (global){
module.exports = require('client') ? /* istanbul ignore next */ window : global
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"client":24}],24:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],25:[function(require,module,exports){
module.exports = { 
  arr : toArray
}

function toArray(d){
  return Array.prototype.slice.call(d, 0)
}
},{}],26:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],27:[function(require,module,exports){
module.exports = function keys(o) {
  return Object.keys(o || {})
}
},{}],28:[function(require,module,exports){
module.exports = function not(fn){
  return function(){
    return !fn.apply(this, arguments)
  }
}
},{}],29:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22,"owner":30,"to":32}],30:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"client":31,"dup":23}],31:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],32:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],33:[function(require,module,exports){
var has = require('has')

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
},{"has":34}],34:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],35:[function(require,module,exports){
module.exports = function identity(d) {
  return d
}
},{}],36:[function(require,module,exports){
module.exports = function includes(pattern){
  return function(d){
    return ~d.indexOf(pattern)
  }
}
},{}],37:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],38:[function(require,module,exports){
var is = require('is')
  , to = require('to')
  , owner = require('owner')

module.exports = function log(prefix){
  return function(d){
    if (!owner.console || !console.log.apply) return d;
    is.arr(arguments[2]) && (arguments[2] = arguments[2].length)
    var args = to.arr(arguments)
    args.unshift(prefix.grey ? prefix.grey : prefix)
    return console.log.apply(console, args), d
  }
}
},{"is":39,"owner":40,"to":42}],39:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],40:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"client":41,"dup":23}],41:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],42:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],43:[function(require,module,exports){
module.exports = function objectify(rows, by) {
  var o = {}, by = by || 'name'
  return rows.forEach(function(d){
    return o[d[by]] = d 
  }), o
}
},{}],44:[function(require,module,exports){
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
},{}],45:[function(require,module,exports){
var keys = require('keys')
  , from = require('from')

module.exports = function values(o) {
  return !o ? [] : keys(o).map(from(o))
}
},{"from":46,"keys":53}],46:[function(require,module,exports){
var datum = require('datum')
  , key = require('key')

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
},{"datum":47,"key":49}],47:[function(require,module,exports){
var sel = require('sel')

module.exports = function datum(node){
  return sel(node).datum()
}
},{"sel":48}],48:[function(require,module,exports){
module.exports = function sel(){
  return d3.select.apply(this, arguments)
}
},{}],49:[function(require,module,exports){
var is = require('is')
  , str = require('str')

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
                                : (set ? key(keys.join('.'), v)(o[root] ? o[root] : (o[root] = {}))
                                       : key(keys.join('.'))(o[root]))

    function copy(d){
      key(d, key(d)(o))(masked)
    }
  }
}
},{"is":50,"str":51}],50:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],51:[function(require,module,exports){
var is = require('is') 

module.exports = function str(d){
  return d === 0 ? '0'
       : !d ? ''
       : is.fn(d) ? '' + d
       : is.obj(d) ? JSON.stringify(d)
       : String(d)
}
},{"is":52}],52:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],53:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],54:[function(require,module,exports){
module.exports = require('objectify')
},{"objectify":43}],55:[function(require,module,exports){
module.exports = require('rebind')
},{"rebind":44}],56:[function(require,module,exports){
module.exports = require('values')
},{"values":45}],57:[function(require,module,exports){
"use strict";

/* istanbul ignore next */
var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

// -------------------------------------------
// Adds support for data resources
// -------------------------------------------
module.exports = data;

function data(ripple) {
  log("creating");
  ripple.on("change.data", trickle(ripple));
  ripple.types["application/data"] = {
    header: "application/data",
    check: function check(res) {
      return is.obj(res.body) || !res.body ? true : false;
    },
    parse: function parse(res) {
      var existing = ripple.resources[res.name] || {};
      delete res.headers.listeners;
      extend(res.headers)(existing.headers);

      !res.body && (res.body = []);
      !res.body.on && (res.body = emitterify(res.body));
      res.body.on.change = res.headers.listeners = res.headers.listeners || [];
      res.body.on("change.bubble", function () {
        return ripple.emit("change", [res], not(is["in"](["data"])));
      });

      return res;
    }
  };

  return ripple;
}

function trickle(ripple) {
  return function (res) {
    arguments[0] = arguments[0].body;
    return header("content-type", "application/data")(res) && ripple.resources[res.name].body.emit("change", to.arr(arguments), not(is["in"](["bubble"])));
  };
}

var emitterify = _interopRequire(require("utilise/emitterify"));

var header = _interopRequire(require("utilise/header"));

var extend = _interopRequire(require("utilise/extend"));

var not = _interopRequire(require("utilise/not"));

var log = _interopRequire(require("utilise/log"));

var is = _interopRequire(require("utilise/is"));

var to = _interopRequire(require("utilise/to"));

log = log("[ri/types/data]");
},{"utilise/emitterify":58,"utilise/extend":59,"utilise/header":60,"utilise/is":61,"utilise/log":62,"utilise/not":88,"utilise/to":89}],58:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"dup":7,"emitterify":63}],59:[function(require,module,exports){
module.exports = require('extend')
},{"extend":73}],60:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9,"header":78}],61:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12,"is":80}],62:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13,"log":81}],63:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"def":64,"dup":19,"err":66,"is":70,"keys":71,"not":72}],64:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20,"has":65}],65:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],66:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22,"owner":67,"to":69}],67:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"client":68,"dup":23}],68:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],69:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],70:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],71:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],72:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],73:[function(require,module,exports){
var is = require('is')
  , not = require('not')
  , keys = require('keys')
  , copy = require('copy')

module.exports = function extend(to){ 
  return function(from){
    keys(from)
      .filter(not(is.in(to)))
      .map(copy(from, to))

    return to
  }
}
},{"copy":74,"is":75,"keys":76,"not":77}],74:[function(require,module,exports){
module.exports = function copy(from, to){ 
  return function(d){ 
    return to[d] = from[d], d
  }
}
},{}],75:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],76:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],77:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],78:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33,"has":79}],79:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],80:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],81:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38,"is":82,"owner":83,"to":85}],82:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],83:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"client":84,"dup":23}],84:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],85:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],86:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],87:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],88:[function(require,module,exports){
module.exports = require('not')
},{"not":86}],89:[function(require,module,exports){
module.exports = require('to')
},{"to":87}],90:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

// -------------------------------------------
// API: Synchronises resources between server/client
// -------------------------------------------
module.exports = sync;

function sync(ripple, server) {
  log("creating");

  values(ripple.types).map(headers(ripple));
  ripple.sync = emit(ripple);
  ripple.io = io(server);
  ripple.on("change", function (res) {
    return emit(ripple)()(res.name);
  });
  ripple.io.on("change", silent(ripple));
  ripple.io.on("connection", function (s) {
    return s.on("change", change(ripple));
  });
  // ripple.io.on('connection', s => s.on('change', res => emit(ripple)()(res.name)))
  ripple.io.on("connection", function (s) {
    return emit(ripple)(s)();
  });
  return ripple;
}

function change(ripple) {
  return function (req) {
    log("receiving", req.name);

    var socket = this,
        res = ripple.resources[req.name];

    if (!res) return log("no resource", req.name);
    if (!is.obj(res.body)) return silent(ripple)(req);

    var to = header("proxy-to")(res) || identity,
        from = header("proxy-from")(res),
        body = to.call(socket, key("body")(res)),
        deltas = diff(body, req.body);

    if (is.arr(deltas)) return delta("");

    keys(deltas).reverse().filter(not(is("_t"))).map(flatten(deltas)).map(delta);

    function delta(k) {

      var d = key(k)(deltas),
          name = req.name,
          body = res.body,
          index = k.replace(/_/g, ""),
          type = d.length == 1 ? "push" : d.length == 2 ? "update" : d[2] === 0 ? "remove" : "",
          value = type == "update" ? d[1] : d[0],
          next = types[type];

      if (!type) {
        return;
      }if (!from || from.call(socket, value, body, index, type, name, next)) {
        if (!index) {
          return silent(ripple)(req);
        }next(index, value, body, name, res);
        // res.headers.silent = true
        ripple(name).emit("change");
      }
    }
  };
}

function flatten(base) {
  return function (k) {
    var d = key(k)(base);
    k = is.arr(k) ? k : [k];

    return is.arr(d) ? k.join(".") : flatten(base)(k.concat(keys(d)).join("."));
  };
}

function push(k, value, body, name) {
  var path = k.split("."),
      tail = path.pop(),
      o = key(path.join("."))(body) || body;

  is.arr(o) ? o.splice(tail, 0, value) : o[k] = value;
}

function remove(k, value, body, name) {
  var path = k.split("."),
      tail = path.pop(),
      o = key(path.join("."))(body) || body;

  is.arr(o) ? o.splice(tail, 1) : delete o[tail];
}

function update(k, value, body, name) {
  key(k, value)(body);
}

function headers(ripple) {
  return function (type) {
    var parse = type.parse || noop;
    type.parse = function (res) {
      if (client) return (parse.apply(this, arguments), res);
      var existing = ripple.resources[res.name],
          from = header("proxy-from")(existing),
          to = header("proxy-to")(existing);

      res.headers["proxy-from"] = header("proxy-from")(res) || header("from")(res) || from;
      res.headers["proxy-to"] = header("proxy-to")(res) || header("to")(res) || to;
      return (parse.apply(this, arguments), res);
    };
  };
}

function silent(ripple) {
  return function (res) {
    return (res.headers.silent = true, ripple(res));
  };
}

function io(opts) {
  return !client ? require("socket.io")(opts.server || opts) : window.io ? window.io() : is.fn(require("socket.io-client")) ? require("socket.io-client")() : { on: noop, emit: noop };
}

// emit all or some resources, to all or some clients
function emit(ripple) {
  return function (socket) {
    return function (name) {
      if (arguments.length && !name) return;
      if (!name) return (values(ripple.resources).map(key("name")).map(emit(ripple)(socket)), ripple);

      var res = ripple.resources[name],
          sockets = client ? [ripple.io] : ripple.io.of("/").sockets,
          lgt = stats(sockets.length, name),
          silent = header("silent", true)(res);

      return silent ? delete res.headers.silent : !res ? log("no resource to emit: ", name) : is.str(socket) ? lgt(sockets.filter(by("sessionID", socket)).map(to(res))) : !socket ? lgt(sockets.map(to(res))) : lgt([to(res)(socket)]);
    };
  };
}

function to(res) {
  return function (socket) {
    var fn = res.headers["proxy-to"] || identity,
        body = is.fn(res.body) ? "" + res.body : res.body,
        body = fn.call(socket, body);

    body && socket.emit("change", {
      name: res.name,
      body: body,
      headers: res.headers
    });

    return !!body;
  };
}

function stats(total, name) {
  return function (results) {
    log(str(results.filter(Boolean).length).green.bold + "/" + str(total).green, "sending", name);
  };
}

var identity = _interopRequire(require("utilise/identity"));

var replace = _interopRequire(require("utilise/replace"));

var matches = _interopRequire(require("utilise/matches"));

var values = _interopRequire(require("utilise/values"));

var header = _interopRequire(require("utilise/header"));

var client = _interopRequire(require("utilise/client"));

var noop = _interopRequire(require("utilise/noop"));

var keys = _interopRequire(require("utilise/keys"));

var key = _interopRequire(require("utilise/key"));

var str = _interopRequire(require("utilise/str"));

var not = _interopRequire(require("utilise/not"));

var log = _interopRequire(require("utilise/log"));

var err = _interopRequire(require("utilise/err"));

var by = _interopRequire(require("utilise/by"));

var is = _interopRequire(require("utilise/is"));

var diff = require("jsondiffpatch").diff;

log = log("[ri/sync]");
err = err("[ri/sync]");
var types = { push: push, remove: remove, update: update };
},{"jsondiffpatch":2,"socket.io":2,"socket.io-client":2,"utilise/by":91,"utilise/client":92,"utilise/err":93,"utilise/header":94,"utilise/identity":95,"utilise/is":96,"utilise/key":97,"utilise/keys":98,"utilise/log":99,"utilise/matches":100,"utilise/noop":140,"utilise/not":141,"utilise/replace":142,"utilise/str":143,"utilise/values":144}],91:[function(require,module,exports){
module.exports = require('by')
},{"by":101}],92:[function(require,module,exports){
module.exports = require('client')
},{"client":107}],93:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"dup":8,"err":108}],94:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9,"header":112}],95:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10,"identity":114}],96:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12,"is":115}],97:[function(require,module,exports){
module.exports = require('key')
},{"key":116}],98:[function(require,module,exports){
module.exports = require('keys')
},{"keys":120}],99:[function(require,module,exports){
arguments[4][13][0].apply(exports,arguments)
},{"dup":13,"log":121}],100:[function(require,module,exports){
arguments[4][91][0].apply(exports,arguments)
},{"by":101,"dup":91}],101:[function(require,module,exports){
var key = require('key')
  , is  = require('is')

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
},{"is":102,"key":103}],102:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],103:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49,"is":104,"str":105}],104:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],105:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51,"is":106}],106:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],107:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],108:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22,"owner":109,"to":111}],109:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"client":110,"dup":23}],110:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],111:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],112:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33,"has":113}],113:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],114:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],115:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],116:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49,"is":117,"str":118}],117:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],118:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51,"is":119}],119:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],120:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],121:[function(require,module,exports){
arguments[4][38][0].apply(exports,arguments)
},{"dup":38,"is":122,"owner":123,"to":125}],122:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],123:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"client":124,"dup":23}],124:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],125:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],126:[function(require,module,exports){
module.exports = function noop(){}
},{}],127:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],128:[function(require,module,exports){
module.exports = function replace(from, to){
  return function(d){
    return d.replace(from, to)
  }
}
},{}],129:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51,"is":130}],130:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],131:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45,"from":132,"keys":139}],132:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"datum":133,"dup":46,"key":135}],133:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"dup":47,"sel":134}],134:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"dup":48}],135:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"dup":49,"is":136,"str":137}],136:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],137:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"dup":51,"is":138}],138:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],139:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],140:[function(require,module,exports){
module.exports = require('noop')
},{"noop":126}],141:[function(require,module,exports){
arguments[4][88][0].apply(exports,arguments)
},{"dup":88,"not":127}],142:[function(require,module,exports){
module.exports = require('replace')
},{"replace":128}],143:[function(require,module,exports){
module.exports = require('str')
},{"str":129}],144:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56,"values":131}],145:[function(require,module,exports){
module.exports = require('all')
},{"all":146}],146:[function(require,module,exports){
var to = require('to')

module.exports = function all(selector, doc){
  var prefix = !doc && document.head.createShadowRoot ? 'html /deep/ ' : ''
  return to.arr((doc || document).querySelectorAll(prefix+selector))
}
},{"to":147}],147:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],148:[function(require,module,exports){
module.exports = function raw(selector, doc){
  var prefix = !doc && document.head.createShadowRoot ? 'html /deep/ ' : ''
  return (doc ? doc : document).querySelector(prefix+selector)
}
},{}],149:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],150:[function(require,module,exports){
module.exports = require('raw')
},{"raw":148}],151:[function(require,module,exports){
arguments[4][89][0].apply(exports,arguments)
},{"dup":89,"to":149}]},{},[1]);
