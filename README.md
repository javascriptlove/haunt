# Haunt.js

Haunt.js is a scraping tool for PhantomJS. It simply takes care of everything you can do with phantom, but without the need to remember complex APIs. See the full example below


```javascript
var haunt = require('./haunt.js');

haunt.create({ 
        log: true,
        userAgent: 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
    })
    .get('http://example.com')
    .title(function(title) {
        console.log(title);
    })
    .html('.mainContainer h1', function(html) {
        console.log(html);
    })
    .attr('h1', 'class', function(attr) {
        console.log(attr);
    })
    .style('body', 'backgroundColor', function(style) {
        console.log(style);
    })
    .dataList('prices', '.prices b -> number')
    .dataList('items', '.items > li', {
        'title': 'h1',
        'image': 'img@src',
        'url': 'a@href',
        'description': '.description p -> trim',
        'price': '.price span -> removeWhitespace -> number',
        'length': '.length -> decimal'
    })
    .wait(1000)
    .click('a[href="/login"]')
    .waitFor('.username')
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
var haunt = require('./haunt.js');
haunt.create().open('https://github.com').title(function(title) {
    console.log(title)
});
```

`.create([options])` is the only function being exported, and it returns a promise-like *Haunt object* which can be chained with a set of calls to run a scenario.

Accepts an `options` object with the next keys:

`autoReturn: true|false` optionally return the haunt data to the console and terminate the phantom process
`log: true|false` optionally enable the logs for the process, if you want to track page errors or other problems
`userAgent: string` set a custom user agent string

**`ajax`**

`.ajax(method, url, [data], callback(results))` Run ajax request in context of currently running page. Callback gets an object with multiple properties including `status`, `headers` (an array of header rows), `response`, `responseText`, `responseXML` and `readyState`.

**`attr`**

`.attr(selector, attribute, callback(attributeValue))` find the specified selector and get its attribute value.

**`click`**

`.click(selector)` perform the click event on the specified selector.

**`computedStyle`**

`.computedStyle(selector, styleName, callback(styleValue))` find the specified selector and get its computed style value. Uses Window.getComputedStyle

**`dataList`**

`.dataList(dataKey, selector[, children])` the core of operation, it allows to get an array of data from document and save it into a storage under the `dataKey`. If the `children` parameter is present, the result will be an array with objects with specified keys-values from `children`.  

**`end`**

`.end([callback])` end the phantom process and run an optional callback before that.

**`exists`**

`.exists(selector, callback(exists))` check if the specified selector exists on page (including the invisible ones).

**`get, go, open`**

`.get(url)` navigate to a given URL and continue to next step when the page loading is done.

**`html`**

`.html(selector, callback(html))` returns the innerHTML of the given selector. Synchronous is `.getHtml`.

**`return`**

`.return([callback])` return `this.data` to the console and end the phantom process.

**`style`**

`.style(selector, styleName, callback(styleValue))` find the specified selector and get its style value. Useful when inline styles specified.

**`title`**

`.title(callback(title))` get the document title and run the callback. Synchronous is `.getTitle`.

**`value`**

`.value(selector, callback(value))` Gets the `value` of the `selector` and runs callback with its value.

**`wait`**

`.wait(ms)` wait for specific time in milliseconds

**`waitFor`**

`.waitFor(selector, [ms])` wait for specific selector to appear on page with an optional timeout specified, defaulting to 30000ms.

**`getData`**

`.getData([key])` *sync* Gets the value of the `key` or returns full data object.

**`setData`**

`.setData(key, value)` *sync* Sets the `value` to the `key` to be used later. 

**`setValue`**

`.setValue(selector, value)` Sets the `value` of the `selector` input fields.


## Developing haunt.js

If you want to change the source and run a src-to-build compiler to make code old-javascript-compatible, use the included npm command

```
npm i
npm run build
```

The build will be in the `build/` folder, so just use it in your scripts like this:

```javascript
var haunt = require('./build/haunt.js');
haunt.create(); // etc. etc.
```