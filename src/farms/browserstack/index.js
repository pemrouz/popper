import browsers from './browsers.json'

export default { browsers, connect }

const err = require('utilise/err')('[popper][browserstack]')

function connect(wd) {
  const env  = process.env
      , key  = env.BROWSERSTACK_KEY
      , user = env.BROWSERSTACK_USERNAME
      , host = 'hub.browserstack.com'

  return !user || !key 
       ? (err('Please provide your BrowserStack Credentials'), false)
       : wd.remote(host, 80, user, key)
}