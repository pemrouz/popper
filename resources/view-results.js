module.exports = function viewResults(results){
  var id = location.pathname.split('dashboard/').pop().replace(/-$/, '-?')
  raw('#mocha').innerHTML = results[id] ? results[id].html : 'No connected agent yet..'
}