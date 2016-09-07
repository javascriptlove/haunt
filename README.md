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
    .end()
;
```

## Usage

Just put `haunt.js` from `build/` into the same folder you have your script in. Include it with basic require(). 

## Developing haunt.js

To run a src-to-build compiler to make code old-javascript-compatible, use the included npm command

```
npm i
npm run build
```
