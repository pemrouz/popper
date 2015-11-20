module.exports = function(config){
  var env          = process.env
    , cwd          = process.cwd()
    , dir          = __dirname
    , unfiltered   = require('utilise/grep')(console, 'log', /^(?!.*\[ri\/)/)
    , log          = require('utilise/log')('[popper]')
    , err          = require('utilise/err')('[popper]')
    , run          = require('child_process').spawn
    , debounce     = require('utilise/debounce')
    , extend       = require('utilise/extend')
    , values       = require('utilise/values')
    , falsy        = require('utilise/falsy')
    , file         = require('utilise/file')
    , noop         = require('utilise/noop')
    , wrap         = require('utilise/wrap')
    , send         = require('utilise/send')
    , not          = require('utilise/not')
    , str          = require('utilise/str')
    , key          = require('utilise/key')
    , lo           = require('utilise/lo')
    , to           = require('utilise/to')
    , is           = require('utilise/is')
    , by           = require('utilise/by')
    , browserstack = require('./browserstack')
    , resolve      = require('path').resolve
    , serve        = require('serve-static')
    , compression  = require('compression')
    , browserify   = require('browserify')
    , platform     = require('platform')
    , chokidar     = require('chokidar')
    , app          = require('express')()
    , server       = require('http').createServer(app)
    , opts         = extend({ server: server, dir: dir })(config.opts)
    , ripple       = (config.ripple || require('rijs').default)(opts)
    , resdir       = require('rijs.resdir').default(ripple, __dirname)
    , debug        = lo(env.NODE_ENV) == 'debug'
    , ci           = 'npm_package_name' in env
    , wd           = require('wd')
    , fs           = require('fs')
    , results      = ripple('results', {}, { from: result })
    , totals       = ripple('totals', {}, { from: falsy })
    , timeout      = +env.POPPER_TIMEOUT || 20000
    , wait         = debounce(timeout)(quit)
      
  // defaults
  config = config || { }
  config.watch = config. watch || '.'
  config.port  = config.port   || 1945
  config.tests = config.tests  || 'browserify test.js'

  // watch files
  config.watch 
    && log('watching', config.watch)
    && chokidar.watch(config.watch, {
         ignored: [/^\.(.*)[^\/\\]/, /[\/\\]\./, /node_modules(.+)popper/]
       , ignoreInitial: true
       , usePolling: false
       , depth: 5
       })
       .on('change', debounce(generate))

  // icons
  ripple
    .resource(require('icon-ios'))
    .resource(require('icon-linux'))
    .resource(require('icon-android'))
    .resource(require('icon-chrome'))
    .resource(require('icon-firefox'))
    .resource(require('icon-ie'))
    .resource(require('icon-opera'))
    .resource(require('icon-osx'))
    .resource(require('icon-safari'))
    .resource(require('icon-windows'))

  // limit dashboard resources
  values(ripple.resources)
    .map(key('headers.proxy-to', wrap(only('dashboard'))))
  
  // proxy errors and register agent details
  ripple.io.on('connection', connected)

  // serve assets
  app
    .use(compression())
    .use('/utilise.min.js', send(local('utilise', 'utilise.min.js')))
    .use('/utilise.js'    , send(local('utilise', 'utilise.js')))
    .use('/mocha.css'     , send(local('mocha', 'mocha.css')))
    .use('/mocha.js'      , send(local('mocha', 'mocha.js')))
    .use('/d3.min.js'     , send(local('d3', 'd3.min.js')))
    .use('/dashboard/:id' , send(local('./client/view.html')))
    .use('/dashboard'     , send(local('./client/dashboard.html')))
    .use('/'              , serve(local('./client')))
    .use('/'              , index())

  return generate(), spawn(), ripple

  function generate() {
    log('generating tests')
    var bundle = fs.createWriteStream(local('./client/tests.js'))
      , stream = is.fn(config.tests) 
        ? config.tests()
        : run('sh', ['-c', config.tests], {stdio: 'pipe'}).stdout

    ;(stream
      .on('end', debounce(500)(reload))
      .pipe(bundle)
      .flow || noop)()
  }

  function result(r, results, uid){
    if (only('dashboard')(this)) return reload(uid.split('.').shift()), true
    r.platform = this.platform
    ripple('results')[r.platform.uid] = r
    ripple.sync()('results')
    updateTotals()

    var target = str(key('browsers.length')(config)) || '?'
      , passed = ripple('totals').passing

    ci && log('ci targets', passed.green.bold, '/', target.grey)
    ci && passed == target && process.exit(0)
    ci && passed != target && wait()
  }

  function quit(){
    log('no updates received for', timeout/1000, 'seconds. timing out..')
    process.exit(1)
  }

  function updateTotals() {
    var res = values(results)
    ripple('totals', { 
      tests: str(res.map(key('stats.tests')).filter(Boolean).pop() || '?')
    , browsers: str(res.length)
    , passing: str(res.map(key('stats.failures')).filter(is(0)).length || '0')
    })
  }

  function only(path){ 
    return function(d){
      return ~(this.handshake || d.handshake).headers.referer.indexOf(path) && d 
    }
  }

  function spawn(){
    server.listen(config.port, function(){
      log('running on port', server.address().port)
      !config.notunnel && require('ngrok').connect(server.address().port, function(e, url){
        log('tunnelling', url && url.magenta)
        return e ? err('error setting up reverse tunnel', e.stack)
                 : (config.browsers || [])
                    .map(canonical)
                    .filter(Boolean)
                    .forEach(boot(url))
      })
    })
  }

  function boot(url){
    return function(opts){
      log('booting up \033[96m'
          + opts.browserName + '\033[39m (' + (opts.version || 'latest')
          + ') on ' + opts.platform)

      var host = env.BROWSERSTACK_USERNAME && env.BROWSERSTACK_KEY ? 'hub.browserstack.com'
               : env.SAUCE_USERNAME && env.SAUCE_ACCESS_KEY ? 'ondemand.saucelabs.com'
               : err('Please provide either your Sauce Labs or BrowserStack Credentials')
        , user = env.BROWSERSTACK_USERNAME || env.SAUCE_USERNAME
        , access = env.BROWSERSTACK_KEY || env.SAUCE_ACCESS_KEY
        , vm = wd.remote(host, 80, user, access)
        , id = [opts.browserName + (opts.version || ''), 'on', opts.platform].join(' ')

      vm.init(opts, function(e){
        if (e) return err(e, id)
        log('initialised', id.cyan)
        vm.get(url, function(e){
          if (e) return err(e, id)
          log('opened to test page', id.cyan)
          heartbeat(vm)
        })
      })

    }
  }

  function connected(socket){
    socket.platform = parse(socket)
    socket.type = only('dashboard')(socket) ? 'dashboard' : 'agent'
    log('connected', socket.platform.uid.green, socket.type.grey)

    if (debug) socket.on('console', function(){
      log(socket.platform.uid.bold, 'says:', to.arr(arguments).join(' '))
    })

    socket.on('global err', function(message, url, linenumber){
      err('Global error: ', socket.platform.uid.bold, message, url, linenumber)
    })
  }

  function canonical(str){
    if (!is.str(str)) return str
    return browserstack[str] 
  }

  function index(){
    var globals = is.arr(config.globals) ? config.globals.join('\n') : config.globals
      , html = file(local('./client/test.html'))
          .replace('<!-- { extra scripts } -->', globals || '')

    return function(req, res){
      res.send(html)
    }
  }

  function local(module, file){
    var base = !file ? __dirname : require.resolve(module) 
      , read = !file ? module : '../'+file
    return resolve(base, read)
  }

  function heartbeat(vm){
    setInterval(function(){
      vm.eval('', function(e){
        if (e) throw e
      })
    }, 30000)
  }

  function reload(uid) { 
    var agents = ripple
      .io
      .of('/')
      .sockets
      .filter(not(only('dashboard')))
      .filter(uid ? by('platform.uid', uid) : Boolean)
      .map(emitReload)
      .length

    log('reloading', str(agents).cyan, 'agents', uid || '')
  }

  function emitReload(socket) {
    return socket.emit('reload'), socket
  }

  function major(d) {
    return d ? d.split('.').shift() : '?'
  }

  function parse(socket) {
    var ua = socket.handshake.headers['user-agent']
      , p = platform.parse(ua)
      , o = { 
          name: lo(p.name)
        , version: major(p.version)
        , os: { 
            name: lo(p.os.family.split(' ').shift())
          , version: major(p.os.version)
          }
        }

    if (o.os.name == 'os') o.os.name = 'osx'
    if (o.name == 'chrome mobile') o.name = 'chrome'

    var uid = o.name + '-' 
            + o.version + '-' 
            + o.os.name + '-' 
            + o.os.version

    o.uid = uid

    return o
  }

}