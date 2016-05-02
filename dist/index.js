'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = popper;

var _fs = require('fs');

var _child_process = require('child_process');

var _http = require('http');

var _path = require('path');

var _compression = require('compression');

var _compression2 = _interopRequireDefault(_compression);

var _browserify = require('browserify');

var _browserify2 = _interopRequireDefault(_browserify);

var _platform = require('platform');

var _platform2 = _interopRequireDefault(_platform);

var _chokidar = require('chokidar');

var _chokidar2 = _interopRequireDefault(_chokidar);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _rijs = require('rijs.resdir');

var _rijs2 = _interopRequireDefault(_rijs);

var _serveStatic = require('serve-static');

var _serveStatic2 = _interopRequireDefault(_serveStatic);

var _farms = require('./farms');

var _farms2 = _interopRequireDefault(_farms);

var _rijs3 = require('rijs');

var _rijs4 = _interopRequireDefault(_rijs3);

var _wd = require('wd');

var _wd2 = _interopRequireDefault(_wd);

require('utilise');

require('colors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function popper() {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var _ref$tests = _ref.tests;
  var tests = _ref$tests === undefined ? 'browserify test.js' : _ref$tests;
  var _ref$farm = _ref.farm;
  var farm = _ref$farm === undefined ? 'browserstack' : _ref$farm;
  var _ref$notunnel = _ref.notunnel;
  var notunnel = _ref$notunnel === undefined ? false : _ref$notunnel;
  var _ref$runner = _ref.runner;
  var runner = _ref$runner === undefined ? 'mocha' : _ref$runner;
  var _ref$browsers = _ref.browsers;
  var browsers = _ref$browsers === undefined ? [] : _ref$browsers;
  var _ref$globals = _ref.globals;
  var globals = _ref$globals === undefined ? '' : _ref$globals;
  var _ref$port = _ref.port;
  var port = _ref$port === undefined ? 1945 : _ref$port;
  var _ref$watch = _ref.watch;
  var watch = _ref$watch === undefined ? '.' : _ref$watch;
  var _ref$opts = _ref.opts;
  var opts = _ref$opts === undefined ? {} : _ref$opts;
  var timeout = _ref.timeout;
  var ripple = _ref.ripple;


  // defaults
  var wait = debounce(timeout = timeout || +env.POPPER_TIMEOUT || 20000)(quit);
  opts = extend({ server: server, dir: dir })(opts);
  ripple = (ripple || _rijs4.default)(opts);
  (0, _rijs2.default)(ripple, dir);
  browsers = browsers.map(canonical(farm)).filter(Boolean);

  // define data resources
  ripple('results', {}, { from: result });
  ripple('totals', {}, { from: falsy });

  // watch files
  if (watch) {
    log('watching', watch);

    _chokidar2.default.watch(watch, {
      ignored: [/^\.(.*)[^\/\\]/, /[\/\\]\./, /node_modules(.+)popper/],
      ignoreInitial: true,
      usePolling: false,
      depth: 5
    }).on('change', debounce(generate));
  }

  // icons
  ripple(require('browser-icons'));

  // limit dashboard resources
  values(ripple.resources).map(key('headers.proxy-to', wrap(only('dashboard'))));

  // proxy errors and register agent details
  ripple.io.on('connection', connected);

  // serve assets
  app.use((0, _compression2.default)()).use('/utilise.min.js', send(local('utilise', 'utilise.min.js'))).use('/utilise.js', send(local('utilise', 'utilise.js'))).use('/mocha.css', send(local('mocha', 'mocha.css'))).use('/mocha.js', send(local('mocha', 'mocha.js'))).use('/dashboard/:id', send(local('./client/' + runner + '/logs.html'))).use('/dashboard', send(local('./client/dashboard.html'))).use('/', (0, _serveStatic2.default)(local('./client'))).use('/', index());

  return generate(), spawn(), ripple;

  function index() {
    var head = is.arr(globals) ? globals.join('\n') : globals,
        html = file(local('./client/' + runner + '/index.html')).replace('<!-- { extra scripts } -->', head || '');

    return function (req, res) {
      return res.send(html);
    };
  }

  function generate() {
    log('generating tests');

    var bundle = (0, _fs.createWriteStream)(local('./client/tests.js')),
        stream = is.fn(tests) ? tests() : (0, _child_process.spawn)('sh', ['-c', tests], { stdio: 'pipe' }).stdout;(stream.on('end', debounce(500)(reload)).pipe(bundle).flow || noop)();
  }

  function result(_ref2, _ref3) {
    var body = _ref2.body;
    var key = _ref3.key;
    var value = _ref3.value;

    if (only('dashboard')(this)) return reload(key.split('.').shift()), true;
    var result = body || value;
    log('received result from', this.platform.uid);
    result.platform = this.platform;
    update(result.platform.uid, result)(ripple('results'));
    ripple.stream()('results');
    totals();
    ci(result);
  }

  function ci(r) {
    if (!cie || r.stats.running) return;

    browsers.filter(function (d) {
      if (d.passed) return false;
      if (d._name && d._name !== r.platform.name) return false;
      if (d._version && d._version !== r.platform.version) return false;
      if (d._os && d._os !== r.platform.os.name) return false;
      if (d._os_version && d._os_version !== r.platform.os.version) return false;
      return true;
    }).map(function (d) {
      d.passed_by = r.platform.uid;
      d.passed = !r.stats.failures;
      d.passed ? log('browser passed:', r.platform.uid.green.bold) : err('browser failed:', r.platform.uid.red.bold);
    });

    var target = browsers.length,
        passed = browsers.filter(by('passed')).length,
        finished = browsers.filter(by('passed_by')).length;

    log('ci targets', str(passed).green.bold, '/', str(target).grey);

    target === passed ? process.exit(0) : target === finished ? !env.POPPER_TIMEOUT && process.exit(1) : wait();
  }

  function connected(socket) {
    socket.platform = parse(socket);
    socket.type = only('dashboard')(socket) ? 'dashboard' : 'agent';
    log('connected', socket.platform.uid.green, socket.type.grey);

    socket.on('global err', function (message, url, linenumber) {
      return err('Global error: ', socket.platform.uid.bold, message, url, linenumber);
    });

    if (debug) socket.on('console', function () {
      log(socket.platform.uid.bold, 'says:', '', arguments[0], to.arr(arguments[1]).map(str).join(' '));
    });
  }

  function quit() {
    log('no updates received for', timeout / 1000, 'seconds. timing out..');
    process.exit(1);
  }

  function reload(uid) {
    var agents = values(ripple.io.of('/').sockets).filter(not(only('dashboard'))).filter(uid ? by('platform.uid', uid) : Boolean).map(emitReload).length;

    log('reloading', str(agents).cyan, 'agents', uid || '');
  }

  function totals() {
    var res = values(ripple('results'));
    return ripple('totals', {
      tests: str(res.map(key('stats.tests')).filter(Boolean).pop() || '?'),
      browsers: str(res.length),
      passing: str(res.map(key('stats.failures')).filter(is(0)).length || '0')
    });
  }

  function spawn() {
    server.listen(port, function () {
      log('running on port', server.address().port);
      !notunnel && require('ngrok').connect(server.address().port, function (e, url) {
        log('tunnelling', url && url.magenta);
        return e ? err('error setting up reverse tunnel', e.stack) : browsers.map(boot(farm)(url));
      });
    });
  }
}

var log = require('utilise/log')('[popper]'),
    err = require('utilise/err')('[popper]'),
    old = grep(console, 'log', /^(?!.*\[ri\/)/),
    env = process.env,
    dir = __dirname,
    app = (0, _express2.default)(),
    cie = env.CI === 'true',
    server = (0, _http.createServer)(app),
    debug = lo(env.NODE_ENV) == 'debug';

var heartbeat = function heartbeat(vm) {
  return setInterval(function (d) {
    return vm.eval('', function (e) {
      if (e) throw e;
    });
  }, 30000);
};

var canonical = function canonical(farm) {
  return function (browser) {
    return is.str(browser) ? _farms2.default[farm].browsers[browser] : browser;
  };
};

var local = function local(module, file) {
  var base = !file ? __dirname : require.resolve(module),
      read = !file ? module : '../' + file;
  return (0, _path.resolve)(base, read);
};

var emitReload = function emitReload(socket) {
  return socket.emit('reload'), socket;
};

var parse = function parse(socket) {
  var ua = socket.handshake.headers['user-agent'],
      p = _platform2.default.parse(ua),
      o = {
    name: lo(p.name),
    version: major(p.version),
    os: {
      name: lo(p.os.family.split(' ').shift()),
      version: major(p.os.version, p.os.family)
    }
  };

  if (o.os.name == 'os') o.os.name = 'osx';
  if (o.name == 'chrome mobile') o.name = 'chrome';
  if (o.name == 'microsoft edge') o.name = 'ie';

  var uid = o.name + '-' + o.version + '-' + o.os.name + '-' + o.os.version;

  o.uid = uid;

  return o;
};

var major = function major(v, f) {
  return v ? v.split('.').shift() : includes('xp')(lo(f)) ? 'xp' : '?';
};

var only = function only(path) {
  return function (d) {
    return includes(path)((this && this.handshake || d.handshake).headers.referer) && d;
  };
};

var boot = function boot(farm) {
  return function (url) {
    return function (opts) {
      var _opts$_name = opts._name;

      var _name = _opts$_name === undefined ? '?' : _opts$_name;

      var _opts$_version = opts._version;

      var _version = _opts$_version === undefined ? '?' : _opts$_version;

      var _opts$_os = opts._os;
      var _os = _opts$_os === undefined ? '?' : _opts$_os;
      var id = _name.cyan + ' ' + _version.cyan + ' on ' + _os;
      var vm = _farms2.default[farm].connect(_wd2.default);

      if (!vm) err('failed to connect to ' + farm), process.exit(1);

      log('booting up ' + id);

      vm.init(opts, function (e) {
        if (e) return err(e, id);
        log('initialised', id);
        vm.get(url, function (e) {
          if (e) return err(e, id);
          log('opened to test page', id.cyan);
          heartbeat(vm);
        });
      });
    };
  };
};