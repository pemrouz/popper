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