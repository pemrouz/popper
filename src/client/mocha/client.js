import core from 'rijs.core'
import data from 'rijs.data'
import sync from 'rijs.sync'

const ripple = sync(data(core()))
    , all    = require('utilise/all')
    , raw    = require('utilise/raw')
    , to     = require('utilise/to')
    , con    = window.console

// reload on force reload
ripple.io.on('reload', reload)

// after first connect, reload on reconnect
ripple.io.on('connect', d => ripple.io.on('connect', reload))

// send tests-starting signal
ripple('results', { 
  stats: { running: true }
, suites: []
, html: 'Test in progress..'
})

// proxy errors back to terminal
window.onerror = (message, url, linenumber) => 
  ripple.io.emit('global err', message, url, linenumber)

// proxy console logs back to terminal
;['log', 'info', 'warn', 'error', 'debug'].map(m => {
  if (!con || !con[m]) return; // ie
  const sup = Function.prototype.bind.call(con[m], con)
  window.console[m] = function(){
    const args = to.arr(arguments)
    ripple.io.emit('console', m, args.map(d => d))
    sup.apply && sup.apply(con, arguments)
  }
})

// send final results back
window.finish = function(){
  const stats = this.stats
  stats.running = false
  ripple('results', { 
    stats
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