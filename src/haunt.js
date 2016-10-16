/*
Haunt.js
https://github.com/javascriptlove/haunt/
*/

var webpage = require('webpage');

class Haunt {
    constructor(options) {
        this.options = {};
        this.options.waitForTimeout = 30000;
        this.options.waitForPoll = 100;
        if (typeof options === 'object') {
            this.options.log = (options.log === true);

            if (!this.options.log) {
                this.log = function() { }; // reset to nothing
            }

            if (options.waitForTimeout) {
                this.options.waitForTimeout = options.waitForTimeout;
            }

            if (options.userAgent) {
                this.options.userAgent = options.userAgent;
            }
        }
        this.dataStorage = {};
        this.actions = [];
        this.processing = false;
        this.page = webpage.create();

        this.page.onConsoleMessage = this.onConsoleMessage;
        this.page.onError = this.onError;

        if (this.options.userAgent) {
            this.page.settings.userAgent = this.options.userAgent; 
        }

        if (this.options.loadImages) {
            this.page.settings.loadImages = this.options.loadImages;
        } else {
            this.page.settings.loadImages = false;
        }
        
        // aliases for usability and memory relaxing
        this.open = this.go = this.get;
        return this;
    }
    /* 
    Base framework (simple queue system) 
    */
    _push(action) {
        this.actions.push(action);
        if (!this.processing) {
            this._run();
        }
    }
    _run() {
        var that = this;
        this.processing = true;
        this.actions[0](function() {
            that.actions.splice(0, 1);
            that.processing = false;
            if (that.actions.length) {
                that._run();
            }
        }, function() {
            that.fatal('Error while performing step');
        });
    }
    log(message) {
        console.log(message);
        return this;
    }
    then(func) {
        if (typeof func !== 'function') {
            this.fatal('Parameter for `then` is not a function');
        }
        var that = this;
        this._push(function(resolve, reject) {
            func.call(that);
            resolve();
        });
        return this;
    }
    end(func) {
        var that = this;
        this._push(function(resolve, reject) {
            if (typeof func === 'function') {
                func.call(that);
            }
            phantom.exit();
        });
        // no return here
    }
    return() {
        var that = this;
        this._push(function(resolve, reject) {
            console.log(JSON.stringify(that.data));
            phantom.exit();
        });
        // no return here
    }
    fatal(message) {
        console.error('FATAL ERROR: ' + message);
        phantom.exit();
    }
    setData(key, value) {
        this.dataStorage[key] = value;
        return this;
    }
    getData(key) {
        if (typeof key !== 'undefined') {
            return this.dataStorage[key];
        } else {
            return this.dataStorage;
        }
    }
    /* 
    Alias for getData(); but can be used without brackets
    */
    get data() {
        return this.getData();
    }
    onConsoleMessage(msg, line, source) {
        this.log(msg);
        this.log('line #' + line);
        this.log('source: ' + source);
    }
    onError(msg, trace) {
        this.log(msg);
        this.log(trace)
    }
    
    /*
    Synchronous APIs
    */
    getTitle() {
        return this.page.evaluate(function() {
            if (document) {
                return document.title;
            }
        });
    }
    getURL() {
        return this.page.evaluate(function() {
            return window.location.toString();
        });
    }
    getHtml(selector) {
        return this.page.evaluate(function(selector) {
            var element = document.querySelector(selector);
            if (element) {
                return element.innerHTML;
            }
        }, selector);
    }
    getHtmlAll(selector, attribute, props) {
        this.page.evaluate(this.phantomDataFilter);
        return this.page.evaluate(function(selector, attribute, props) {
            var result = [];
            var selector = selector.split('->');
            var elements = document.querySelectorAll(selector[0]);
            if (elements.length) {
                for (var i = 0; i < elements.length; i++) {
                    // if has children specified
                    if (props) {
                        var result_inner = {};
                        for (var p in props) {
                            // check if it's an array
                            // first item in array of props is selector
                            var prop = props[p].split('->');
                            var selector = prop[0];
                            var childAttribute = '';
                            if (selector.indexOf('@') !== -1) { // attribute selector
                                selector = selector.split('@');
                                childAttribute = selector[1];
                                selector = selector[0];
                            }
                            // query element
                            var elem = elements[i].querySelector(selector);
                            if (elem) {
                                if (childAttribute) {
                                    result_inner[p] = elem.getAttribute(childAttribute);    
                                } else {
                                    result_inner[p] = elem.innerHTML;
                                }
                            } else {
                                result_inner[p] = '';
                            }
                            // process filters if filters were provided
                            if (prop.length > 1) {
                                result_inner[p] = phantomDataFilter(result_inner[p], prop.slice(1)); 
                            }
                        }
                        result.push(result_inner);
                    } else {
                        // process filters if filters were provided
                        if (attribute) {
                            var result_inner = elements[i].getAttribute(attribute);
                        } else {
                            var result_inner = elements[i].innerHTML;
                        }
                        if (selector.length > 1) {
                            result_inner = phantomDataFilter(result_inner, selector.slice(1));
                        }
                        result.push(result_inner);
                    }
                }
            }
            return result;
        }, selector, attribute, props);
    }
    phantomDataFilter() {
        window.phantomDataFilter = function(what, filters) {
            what = String(what); // is it ok to do like this?
            for (var a = 0; a < filters.length; a++) {
                var filter = String(filters[a]).trim();
                if (filter == 'removeWhitespace') {
                    what = what.replace(/\s/g, '');
                } if (filter == 'number') {
                    what = parseInt(what, 10);
                } else if (filter == 'decimal' || filter == 'float') {
                    what = parseFloat(what, 10);
                } else if (filter == 'trim') {
                    what = what.trim();
                }
            }
            return what;
        }
    }
    doClick(selector) {
        return this.page.evaluate(function(selector) {
            // http://stackoverflow.com/a/17789929/266561
            if (!HTMLElement.prototype.click) {
                HTMLElement.prototype.click = function() {
                    var ev = document.createEvent('MouseEvent');
                    ev.initMouseEvent(
                        'click',
                        /*bubble*/true, /*cancelable*/true,
                        window, null,
                        0, 0, 0, 0, /*coordinates*/
                        false, false, false, false, /*modifier keys*/
                        0/*button=left*/, null
                    );
                    this.dispatchEvent(ev);
                };
            }
            // now find the element
            var elem = document.querySelector(selector);
            if (elem) {
                elem.click();
                return true;
            } else {
                return false;
            }
        }, selector);
    }

    /* 
    API starts here
    */
    get(url) {
        var that = this;
        this._push(function(resolve, reject) {
            that.page.open(url, function(status) {
                resolve(status);
            });
        });
        return this;
    }
    post(url, data) {
        return this;
    }
    url(func) {
        if (typeof func !== 'function') {
            this.fatal('Parameter for `url` is not a function');
        }
        var that = this;
        that._push(function(resolve, reject) {
            func.call(that, that.getURL());
            resolve();
        });
        return this;
    }
    title(func) {
        if (typeof func !== 'function') {
            this.fatal('Parameter for `title` is not a function');
        }
        var that = this;
        that._push(function(resolve, reject) {
            func.call(that, that.getTitle());
            resolve();
        });
        return this;
    }
    html(selector, func) {
        if (typeof selector !== 'string') {
            this.fatal('First parameter for `html` is not a string');
        }
        if (typeof func !== 'function') {
            this.fatal('Second parameter for `html` is not a function');
        }
        var that = this;
        this._push(function(resolve, reject) {
            func.call(that, that.getHtml(selector));
            resolve();
        });
        return this;
    }
    dataList(key, selector, attribute, props) {
        if (typeof selector !== 'string') {
            this.fatal('First parameter for `dataList` is not a string');
        }
        if (typeof key !== 'string') {
            this.fatal('Second parameter for `dataList` is not a string');
        }
        if (typeof attribute === 'object' && typeof props === 'undefined') {
            props = attribute;
            attribute = ''; 
        }
        var that = this;
        this._push(function(resolve, reject) {
            var results = that.getHtmlAll(selector, attribute, props);
            that.setData(key, results);
            resolve();
        });
        return this;
    }
    click(selector) {
        var that = this;
        this._push(function(resolve, reject) {
            that.doClick(selector);
            resolve();
        });
        return this;
    }
    wait(ms) {
        var that = this;
        this._push(function(resolve, reject) {
            setTimeout(function() {
                resolve();
            }, ms);
        });
        return this;
    }
    waitFor(selector, ms) {
        var that = this;
        that._push(function(resolve, reject) {
            var t = setTimeout(function() {
                clearInterval(i);
                reject();
            }, ms || that.options.waitForTimeout);
            var i = setInterval(function() {
                var result = that.page.evaluate(function(selector) {
                    return !!document.querySelector(selector);
                }, selector);
                if (result) {
                    clearInterval(i);
                    clearTimeout(t);
                    resolve();
                }
            }, that.options.waitForPoll);
        });
        return this;
    }
}

var create = function() {
    return new Haunt();
}

exports.create = create;
