# Haunt.js

Haunt.js is a scraping tool for PhantomJS. It simply takes care of everything you can do with phantom, but without the need to remember complex APIs. See the full example below


```javascript
var page = require('./haunt.js');

page.create({ log: true })
    .get('http://example.com')
    .title(function(title) {
        console.log(title);
    })
    .html('.mainContainer h1', function(html) {
        console.log(html);
    })
    .dataList('prices', '.prices b -> number')
    .dataList('items', '.items > li', {
        'title': 'h1',
        'description': '.description p',
        'price': '.price span -> removeWhitespace -> number',
        'length': '.length -> decimal'
    })
    .wait(1000)
    .click('a[href="/login"]')
    .wait(5000)
    .url(function(url) {
        console.log(url);
    })
    .then(function() {
        console.log(JSON.stringify(this.data));
    })
    .end(function() {
        console.log("WE'RE ALL GONNA DIE NOW");
    })
;
```

## Usage

Just put `haunt.js` from `build/` into the same folder you have your script in. Include it with basic `require()`.

## API

Haunt includes several promise-like asynchronous calls and of course some synchronous helpers. All examples below assume that there is a variable which was setup with `page.create()`.

*The Start*

```javascript
var page = require('./haunt.js');
page.create();
```

`.create([options])` is the only function being exported, and it returns a promise-like *Haunt object* which can be chained with a set of calls to run a scenario.

Accepts an `options` object with the next keys:

`log: true|false` optionally enable the logs for the process, if you want to track page errors or other problems

**`click`**

`.click(selector)` perform the click event on the specified selector.

**`end`**

`.end([func])` end the phantom process and run an optional callback before that.

**`get, go, open`**

`.get(url)` navigate to a given URL and continue to next step when the page loading is done.

**`html`**

`.html(selector)` returns the innerHTML of the given selector. Synchronous is `.getHtml`.

**`return`**

`.return()` return `this.data` to the console and end the phantom process.

**`title`**

`.title(func)` get the document title and run the callback. Synchronous is `.getTitle`.

**`wait`**

`.wait(ms)` wait for specific time in milliseconds

**`waitFor`**

`.waitFor(selector, [ms])` wait for specific selector to appear on page with an optional timeout specified, defaulting to 30000ms.

**`getData`**

`.getData([key])` *sync* Gets the value of the `key` or returns full data object.

**`setData`**

`.setData(key, value)` *sync* Sets the `value` to the `key` to be used later. 

## Developing haunt.js

If you want to change the source and run a src-to-build compiler to make code old-javascript-compatible, use the included npm command

```
npm i
npm run build
```
