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

`.create()` is the only function being exported, and it returns a promise-like *Haunt object* which can be chained with a set of calls to run a scenario.

*click*

`.click(selector)` will perform the click event on the specified selector.

*end*

`.end([func])` will end the phantom process and run an optional callback before that.

*get*

`.get(url)` will navigate to a given URL and continue to next step when the page loading is done.

*title*

`.title(func)` will get the document title and run the callback. Synchronous is `.getTitle`. 



## Developing haunt.js

To run a src-to-build compiler to make code old-javascript-compatible, use the included npm command

```
npm i
npm run build
```
