export default function dashboardResults(node, { results }){ 
  const o = once(node)
      , suites = first(values(results).filter(key('suites.length')))
      , { send } = ripple

  o.classed('has-results', values(results).length)

  o('.no-results', !values(results).length)
    .text('No results available yet')

  o('.suites.column', suites || 1)

  o('.suites')
    ('.totals', ripple('totals'))

  o('.totals')
    ('.tests', key('tests'))
      .text(String)
      .attr('label', 'Tests')
  o('.totals')
    ('.browsers', key('browsers'))
      .text(String)
      .attr('label', 'Browsers')
  o('.totals')
    ('.passing', key('passing'))
      .text(String)
      .attr('label', 'Passing')

  o('.suites')
    ('.suite', key('suites')) 
      .text(key('name'))

  o('.browser.column', values(results))
    .classed('is-running', key('stats.running'))

  o('.browser')
    ('h1.platform', key('platform'))

  o('.platform')
    ('[version]', [])

  o('.platform')
    (iconOS, 1)
      .attr('version', key('os.version'))
      .classed('os', 1)

  o('.platform')
    (iconBrowser, 1)
      .attr('version', key('version'))
   
  o('.browser')
    ('.summary', key('stats'))
      .text(formatSummary)
  
  o('.browser')
    ('a.run-tests', key('stats'))
      .text('Rerun')
      .classed('disabled', key('running'))
      .on('click.rerun', rerun)

  o('.browser')
    ('a.view-tests', key('platform.uid'))
      .text('View Results')
      .attr('target', '_blank')
      .attr('href', viewLink)

  o('.browser')
    ('.result', proxy(key('suites'), allSuites))
      ('span', 1)
        .text(formatResult)
        .classed('error', by('failures', not(is('0'))))

  o('.result')
    ('i.fails', proxy(key('failures'), str))
      .classed('error', not(is('0')))
      .text(String)
  o('.result')
    ('i.delim', '/')
      .text(String)
  o('.result')
    ('i.total', key('total'))
      .text(String)

  function rerun(d) {
    var uid = from.parent.call(this, 'platform').uid
    send('results', 'RERUN', uid)
    // update(uid + '.stats.running', true)(ripple('results'))
  }

  function allSuites(d) {
    return d.length ? d : (key('suites')(suites) || []).map(wrap({}))
  }

  function iconBrowser(d) {
    return 'icon-' + d.name
  }

  function iconOS(d) {
    return 'icon-' + d.os.name
  }

  function viewLink(d){
    return '/dashboard/' + d
  }

  function formatSummary(d){
    return d.passes && d.tests ? Math.round(d.passes/d.tests*1000)/10+'%' : '?'
  }

  function formatResult(d){
    return !str(d.total) || !str(d.failures) ? '...' : Math.round((d.total-d.failures)/d.total*1000)/10 + '%'
  }

}