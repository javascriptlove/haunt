# Haunt.js

Haunt.js is a scraping tool for PhantomJS. It simply takes care of everything you can do with phantom, but without the need to remember complex APIs. See a full example below


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
    .dataList('.prices b', 'prices')
    .then(function() {
        console.log(JSON.stringify(this.data));
    })
    .end()
;
```
