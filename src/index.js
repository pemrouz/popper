export default function popper({ 
  tests = 'browserify test.js'
, farm = 'browserstack'
, notunnel = false
, runner = 'mocha'
, browsers = []
, globals = ''
, port = 1945
, watch = '.'
, opts = {}
, timeout
, ripple
} = {}){
   
  // defaults
  const wait = debounce(timeout = timeout || +env.POPPER_TIMEOUT || 20000)(quit)
  opts = extend({ server, dir })(opts)
  ripple = (ripple || rijs)(opts)
  resdir(ripple, dir)
  browsers = browsers
    .map(canonical(farm))
    .filter(Boolean)

  // define data resources
  ripple('results', {}, { from: result })
  ripple('totals' , {}, { from: falsy })

  // watch files
  if (watch) {
    log('watching', watch)

    chokidar.watch(watch, {
      ignored: [/^\.(.*)[^\/\\]/, /[\/\\]\./, /node_modules(.+)popper/]
    , ignoreInitial: true
    , usePolling: false
    , depth: 5
    })
    .on('change', debounce(generate))
  }

  // icons
  ripple(require('browser-icons'))

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
    .use('/dashboard/:id' , send(local(`./client/${runner}/logs.html`)))
    .use('/dashboard'     , send(local('./client/dashboard.html')))
    .use('/'              , serve(local('./client')))
    .use('/'              , index())

  return generate()
       , spawn()
       , ripple

  function index(){
    const head = is.arr(globals) ? globals.join('\n') : globals
        , html = file(local(`./client/${runner}/index.html`))
            .replace('<!-- { extra scripts } -->', head || '')

    return (req, res) => res.send(html)
  }

  function generate() {
    log('generating tests')

    const bundle = write(local('./client/tests.js'))
        , stream = is.fn(tests) 
            ? tests()
            : run('sh', ['-c', tests], { stdio: 'pipe' }).stdout

    ;(stream
      .on('end', debounce(500)(reload))
      .pipe(bundle)
      .flow || noop)()
  }

  function result({ body }, { key, value }){
    if (only('dashboard')(this)) return reload(key.split('.').shift()), true
    const result = body || value
    log('received result from', this.platform.uid)
    result.platform = this.platform
    update(result.platform.uid, result)(ripple('results'))
    ripple.stream()('results')
    totals()
    ci(result)
  }

  function ci(r) {
    if (!cie || r.stats.running) return

    browsers
      .filter(d => {
        if (d.passed)                                                 return false
        if (d._name       && d._name       !== r.platform.name)       return false
        if (d._version    && d._version    !== r.platform.version)    return false
        if (d._os         && d._os         !== r.platform.os.name)    return false
        if (d._os_version && d._os_version !== r.platform.os.version) return false
        return true
      })
      .map(d => {
        d.passed_by = r.platform.uid
        d.passed    = !r.stats.failures
        d.passed
          ? log('browser passed:', r.platform.uid.green.bold)
          : err('browser failed:', r.platform.uid.red.bold)
      })

    const target   = browsers.length
        , passed   = browsers.filter(by('passed')).length
        , finished = browsers.filter(by('passed_by')).length

    log('ci targets', str(passed).green.bold, '/', str(target).grey)
    
      target === passed   ? process.exit(0)
    : target === finished ? process.exit(1)
                          : wait()
  }

  function connected(socket){
    socket.platform = parse(socket)
    socket.type = only('dashboard')(socket) ? 'dashboard' : 'agent'
    log('connected', socket.platform.uid.green, socket.type.grey)

    socket.on('global err', (message, url, linenumber) => err('Global error: ', socket.platform.uid.bold, message, url, linenumber))

    if (debug) 
      socket.on('console', d => log(socket.platform.uid.bold, 'says:', to.arr(arguments).join(' ')))
  }

  function quit(){
    log('no updates received for', timeout/1000, 'seconds. timing out..')
    process.exit(1)
  }

  function reload(uid) { 
    const agents = values(ripple
      .io
      .of('/')
      .sockets)
      .filter(not(only('dashboard')))
      .filter(uid ? by('platform.uid', uid) : Boolean)
      .map(emitReload)
      .length

    log('reloading', str(agents).cyan, 'agents', uid || '')
  }

  function totals() {
    const res = values(ripple('results'))
    return ripple('totals', { 
      tests: str(res.map(key('stats.tests')).filter(Boolean).pop() || '?')
    , browsers: str(res.length)
    , passing: str(res.map(key('stats.failures')).filter(is(0)).length || '0')
    })
  }

  function spawn(){
    server.listen(port, () => {
      log('running on port', server.address().port)
      !notunnel && require('ngrok').connect(server.address().port, (e, url) => {
        log('tunnelling', url && url.magenta)
        return e ? err('error setting up reverse tunnel', e.stack)
                 : browsers.map(boot(farm)(url))
      })
    })
  }

}

import { createWriteStream as write } from 'fs'
import { spawn as run } from 'child_process'
import { createServer } from 'http'
import { resolve } from 'path'
import compression from 'compression'
import browserify from 'browserify'
import platform from 'platform'
import chokidar from 'chokidar'
import express from 'express'
import resdir from 'rijs.resdir'
import serve from 'serve-static'
import farms from './farms'
import rijs from 'rijs'
import wd from 'wd'
import 'utilise'
import 'colors'

const log = require('utilise/log')('[popper]')
    , err = require('utilise/err')('[popper]')
    , old = grep(console, 'log', /^(?!.*\[ri\/)/)
    , env = process.env
    , dir = __dirname
    , app = express()
    , cie  = env.CI === 'true'
    , server = createServer(app) 
    , debug  = lo(env.NODE_ENV) == 'debug'

const heartbeat = vm => setInterval(d => vm.eval('', e => { if (e) throw e }), 30000)

const canonical = farm => browser => is.str(browser) 
  ? farms[farm].browsers[browser]
  : browser

const local = (module, file) => {
  const base = !file ? __dirname : require.resolve(module) 
      , read = !file ? module : '../'+file
  return resolve(base, read)
}

const emitReload = socket => (socket.emit('reload'), socket)

const parse = socket => {
  const ua = socket.handshake.headers['user-agent']
      , p = platform.parse(ua)
      , o = { 
          name: lo(p.name)
        , version: major(p.version)
        , os: { 
            name: lo(p.os.family.split(' ').shift())
          , version: major(p.os.version, p.os.family)
          }
        }

  if (o.os.name == 'os') o.os.name = 'osx'
  if (o.name == 'chrome mobile') o.name = 'chrome'

  const uid = o.name
      + '-' + o.version
      + '-' + o.os.name
      + '-' + o.os.version

  o.uid = uid

  return o
}

const major = (v, f) => 
    v                     ? v.split('.').shift() 
  : includes('xp')(lo(f)) ? 'xp'
                          : '?'

const only = path => function(d){ return includes(path)(((this && this.handshake) || d.handshake).headers.referer) && d }

const boot = farm => url => opts => {
  const { _name = '?', _version = '?', _os = '?' } = opts
      , id = `${_name.cyan} ${_version.cyan} on ${_os}`
      , vm = farms[farm].connect(wd)

  if (!vm) err('failed to connect to ' + farm), process.exit(1)

  log(`booting up ${id}`)
  
  vm.init(opts, e => {
    if (e) return err(e, id)
    log('initialised', id)
    vm.get(url, e => {
      if (e) return err(e, id)
      log('opened to test page', id.cyan)
      heartbeat(vm)
    })
  })
}
