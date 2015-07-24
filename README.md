# Popper: Realtime Cross-Browser Automation

The benefit of the ubiquity of the Web is also its pain point when it comes to accurate testing. It is common to see handwavy statements for browser compatibility, for example "IE9+", as if every other OS/platform combination will be just fine if IE9 "works"! For those who need more realistic data, this module makes it _much_ easier to test code earlier on in the development lifecycle, even in realtime. 

![image](https://cloud.githubusercontent.com/assets/2184177/8728132/6a211df0-2bdb-11e5-8295-cb2e9f836203.png)
_Snapshot of Test Results for Ripple v0.3 on latest Chrome, Firefox, IE, Android and iOS_

## Features

* **Spawn** agents using BrowserStack/Sauce
* **Multi-repo** testing, where changing one module might affect others (e.g microlibs in [utilise](https://github.com/utilise/utilise) or modules in [ripple v0.3](https://github.com/pemrouz/ripple))
* **Aggregate** results per-repo, per-browser and globally in realtime 
* Rerun on **file change**
* Open your own browser tabs to act as test agents, useful for **enterprise context**
* Automatic **OS/Browser identification** and simple icons
* **CLI** with convenient defaults
* `.popper.yml` file for persisting test **config per repo**
* Proxy console/error statements, making **remote debugging** on mobile devices a lot easier
* **Force a rerun** on a particular agent
* **View a snapshot of the results page** as produced by the agent

## Roadmap

* [[RESOLVED]](https://github.com/pemrouz/popper/issues/2) ~~**CI Integration**: Have the `popper` command return proper exit codes after running tests across the selected browsers.~~
* **Continous Testing**: Publicise test results for any `<org>/<repo>` so anyone can see it, similar to coveralls for coverage.
* **Node Tests**: Also run in and aggregate server-side test results from node
* **Performance**: Include simple performance stats using [perf](https://github.com/utilise/utilise#--perf) per-test
* **Statistical**: Aggregate over multiple trials to address known variance issues in client-side testing
* **Interactive Session**: Jump into interactive session on BrowserStack/Sauce
* **Interactice Console**: Open an in-browser terminal to agent console
* **Pooling**: Allowing pooling agents rather than running on all open test agents
* **Sauce Labs**: Readd support for Sauce Labs
* **`.popperrc`**: For changing global defaults
* **Optional Tunnel**: Allow completely disabling the tunnelling via ngrok

## Usage 

```bash
# since this uses lots and lots of tiny libs, I recommend using npm3
npm i -g popper # install globally
npm i -D popper # install locally

# to run
popper

# to also see logs from each browser in terminal window
NODE_ENV=debug popper 

# if you are using browserstack
export BROWSERSTACK_USERNAME=...
export BROWSERSTACK_KEY=...
```

Once running, open a browser tab to `localhost:1945` (or the external ngrok URL) to run the tests, and keep open `localhost:1945/dashboard` to see the results as you continue to make changes. If you specified any `browsers`, they will be launched on BrowserStack and pointed to the test page.

When you run `popper` in a folder:

* If there is a `popper.js` file, it will run that ([example](https://github.com/pemrouz/ripple/blob/master/popper.js))
* If there is a `popper.yml` file, it will use options from that ([example](https://github.com/utilise/utilise/blob/master/.popper.yml))
* If there are any command-line arguments passed, those will take precedence in overriding the `.yml` config
* If there is nothing, it will default convenient options so you can just jump into most repos and run `popper`
 
### YAML Options ([Example](https://github.com/utilise/utilise/blob/master/.popper.yml) | [Example](https://github.com/rijs/reactive/blob/master/.popper.yml))

```yaml
# these will be added to the head
globals:
  - <script src="https://cdn.polyfill.io/v1/polyfill.min.js"></script>
  - <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js" charset="utf-8"></script>
  - <script src="https://cdnjs.cloudflare.com/ajax/libs/chai/3.0.0/chai.min.js"></script>
  - <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.10.3/moment.min.js"></script>

# this is the command to generate the tests bundle on startup and after a file change detected
tests: browserify ./node_modules/*/test.js
  -i moment
  -i colors
  -i jsdom
  -i chai
  -i d3
  -i ./node_modules/pause/test.js
  -i ./node_modules/send/test.js
  -i ./node_modules/file/test.js
  -i ./node_modules/via/test.js
  | sed -E "s/require\('moment'\)/window.moment/"
  | sed -E "s/require\('chai'\)/window.chai/"
  | sed -E "s/require\('d3'\)/window.d3/"
  | uglifyjs

# browsers to spawn in browserstack/sauce 
# can be wd capabilities object to specify os, device, version, etc: https://www.browserstack.com/automate/capabilities
browsers: 
  - ie9
  - android
  - iphone
  - opera
  - safari

# port to run on locally
port: 1945

# glob(s) to watch for file changes
watch: ./node_modules/*/index.js
```

In this case, the test command will rebuild the project before bundling the tests after each file change.

```yaml
globals:
  - <script src="https://cdn.polyfill.io/v1/polyfill.min.js"></script>
  - <script src="https://cdnjs.cloudflare.com/ajax/libs/chai/3.0.0/chai.min.js"></script>

tests: (npm run build > /dev/null) && browserify ./test.js
  -i colors
  -i chai
  | sed -E "s/require\('chai'\)/window.chai/"
  | uglifyjs

watch: 
  - src
  - test.js
```

### CLI Options

```bash
  usage: popper
    
  options:
    -b, --browsers: browser to spawn and run tests on, default none
    -t, --test: command to generate test bundle, defaults to "browserify test.js"
    -p, --port: port to run on, default to 1945
    -w, --watch: files to watch for changes, default to .
```

### Default Options

If any of the options are missing from the local YAML config or CLI arguments, they will default to:

* Globals: `none`
* Browsers: `none`
* Test: `browserify test.js`
* Port: `1945`
* Watch: `.`

### JS Options ([Example](https://github.com/pemrouz/ripple/blob/master/popper.js))

```js
popper = require('popper')
popper = popper({ 
  watch: ['src', 'test']
, port: 19450
, tests: stream    // function that returns stream to be piped to the test bundle file
, globals: string  // string of global script tags to add
, browsers: array  // array of browsers to spawn
})
```

Popper uses Ripple under the hood. The JS API is particularly useful if you need to extend the available resources. For example, for testing Ripple itself and it's server/client synchronisation module, I use the following to reset test resources before each test:

```js
popper.io.on('connection', function(socket){
  socket.on('beforeEach', function(){
    popper('foo'          , 'bar', headers())
    popper('object'       , { a:0 , b:1, c:2 }, headers())
    popper('array'        , [{i:0}, {i:1},{i:2}], headers())
    popper({ name: 'proxy', body: [{i:0}, {i:1},{i:2}], headers: { to: to, from: from, 'cache-control': 'no-cache', silent: true, reactive: false }})
    popper('my-component' , component, headers())
    popper.sync(socket)()
    socket.emit('done')
  })
})
```

## Contributing

* I'm sure the first cut will have many issues, please open up an issue here if you run into any. 
* Feel free to suggest any new ideas you think would useful to improve tooling for testing for Web developers.
* Feel free to pick up any items in the roadmap, codebase is just ~200 lines and most issues should be trivial to implement.

## Credit

Mostly inspired by [browser-repl](https://github.com/Automattic/browser-repl).
