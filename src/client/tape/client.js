import debounce from 'utilise/debounce'
import escape   from 'utilise/escape'
import raw      from 'utilise/raw'
import to       from 'utilise/to'
import core     from 'rijs.core'
import data     from 'rijs.data'
import sync     from 'rijs.sync'

const ripple = sync(data(core()))
    , con    = window.console
    , log    = console.log

var html = ''
  , running = true 
  , failures = 0
  , passes = 0
  , tests = 0
  , name = 'All Tests'
  , output = raw('pre')

// reload on force reload
ripple.io.on('reload', reload)

// after first connect, reload on reconnect
ripple.io.on('connect', d => ripple.io.on('connect', reload))

// send tests-starting signal
ripple('results', { 
  stats: { running }
, suites: []
, html: 'Test in progress..'
})

// proxy errors back to terminal
window.onerror = (message, url, linenumber) => 
  ripple.io.emit('global err', message, url, linenumber)

// proxy console logs back to terminal
;['log', 'info', 'warn', 'error', 'debug'].map(m => {
  if (!con) return; // ie
  const sup = window.console[m]
  window.console[m] = function(){
    const args = to.arr(arguments)
    ripple.io.emit('console', m, args.map(d => d))
    sup.apply && sup.apply(con, arguments)
  }
})

// stream results back
var update = debounce(function(){
  const stats = { running, tests, passes, failures }
      , suites = [{ name, failures, total: tests }]

  ripple('results', { stats, suites, html })
})

// listen on log
console.log = function(){
  const line = to.arr(arguments).join(' ')
  html += escape(line) + '\n'
  
  if (-1 === includes('# tests')(line)) running = false
  if (-1 === includes('ok ')(line)) { passes++; tests++ }
  if (-1 === includes('not ok ')(line)) { failures++; tests++ }

  update()
  output.innerHTML = html
  log.apply(console, arguments)
}

function reload() {
  location.reload()
}