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

        this.page.settings.loadImages = !!this.options.loadImages;
        
        // aliases for usability and memory relaxing
        this.open = this.start = this.go = this.get;
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
        this.processing = true;
        this.actions[0](function() {
            this.actions.splice(0, 1);
            this.processing = false;
            if (this.actions.length) {
                this._run();
            }
        }.bind(this), function() {
            this.fatal('Error while performing step');
        }.bind(this));
    }
    log(message) {
        console.log(message);
        return this;
    }
    then(func) {
        if (typeof func !== 'function') {
            this.fatal('Parameter for `then` is not a function');
        }
        this._push(function(resolve, reject) {
            func.call(this);
            resolve();
        }.bind(this));
        return this;
    }
    /**
     * Run an optional callback and finish the process
     *
     * @param {function} [callback] - callback to run before exiting the process
     */
    end(func) {
        this._push(function(resolve, reject) {
            if (typeof func === 'function') {
                func.call(this);
            }
            phantom.exit();
        }.bind(this));
        // no return here
    }
    check(variable, type) {
        if (typeof variable !== type) {
            this.fatal('Parameter ' + variable + ' is not of type `' + type + '`');
        }
    }
    fatal(message) {
        console.error('FATAL ERROR: ' + message);
        phantom.exit(1);
    }
    /**
     * Output this.data to console and end the process, used to return data to external scripts
     *
     * @param {function} [callback] - callback to run before exiting the process
     */
    return(func) {
        this.end(function() {
            if (typeof func === 'function') {
                func.call(this);
            }
            console.log(JSON.stringify(this.data));            
        });
        // no return here
    }
    /**
     * Setter/getter for data storage
     */
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
    /**
     * Alias for getData(); but can be used without brackets
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
    
    /**
     * Synchronous APIs
     */
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
    getAttr(selector, attr) {
        return this.page.evaluate(function(selector, attr) {
            var element = document.querySelector(selector);
            if (element) {
                return element.getAttribute(attr);
            }
        }, selector, attr);
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
    getStyle(selector, style) {
        return this.page.evaluate(function(selector, style) {
            var element = document.querySelector(selector);
            if (element) {
                return element.style[style];
            }
        }, selector, style);
    }
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
    /**
     * Data processing filters ran in Phantom context
     */
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
    
    /** 
     * Asynchronous API starts here
     * These are chainable functions that make up the Haunt scenario
     */
    attr(selector, attr, func) {
        this.check(selector, 'string');
        this.check(attr, 'string');
        this.check(func, 'function');
        this._push(function(resolve, reject) {
            func.call(this, this.getAttr(selector, attr));
            resolve();
        }.bind(this));
        return this;
    }
    click(selector) {
        this._push(function(resolve, reject) {
            this.doClick(selector);
            resolve();
        }.bind(this));
        return this;
    }
    dataList(key, selector, attribute, props) {
        this.check(selector, 'string');
        this.check(key, 'string');
        if (typeof attribute === 'object' && typeof props === 'undefined') {
            props = attribute;
            attribute = ''; 
        }
        this._push(function(resolve, reject) {
            var results = this.getHtmlAll(selector, attribute, props);
            this.setData(key, results);
            resolve();
        }.bind(this));
        return this;
    }
    get(url) {
        this._push(function(resolve, reject) {
            this.page.open(url, function(status) {
                resolve(status);
            });
        }.bind(this));
        return this;
    }
    html(selector, func) {
        this.check(selector, 'string');
        this.check(func, 'function');
        this._push(function(resolve, reject) {
            func.call(this, this.getHtml(selector));
            resolve();
        }.bind(this));
        return this;
    }
    /**
     * TODO: POST data to url
     */
    post(url, data) {
        return this;
    }
    style(selector, style, func) {
        this.check(selector, 'string');
        this.check(style, 'string');
        this.check(func, 'function');
        this._push(function(resolve, reject) {
            func.call(this, this.getStyle(selector, style));
            resolve();
        }.bind(this));
        return this;
    }
    title(func) {
        this.check(func, 'function');        
        this._push(function(resolve, reject) {
            func.call(this, this.getTitle());
            resolve();
        }.bind(this));
        return this;
    }
    url(func) {
        this.check(func, 'function');        
        this._push(function(resolve, reject) {
            func.call(this, this.getURL());
            resolve();
        }.bind(this));
        return this;
    }
    wait(ms) {
        this._push(function(resolve, reject) {
            setTimeout(function() {
                resolve();
            }, ms);
        }.bind(this));
        return this;
    }
    waitFor(selector, ms) {
        this._push(function(resolve, reject) {
            var t = setTimeout(function() {
                clearInterval(i);
                reject();
            }, ms || this.options.waitForTimeout);
            var i = setInterval(function() {
                var result = this.page.evaluate(function(selector) {
                    return !!document.querySelector(selector);
                }, selector);
                if (result) {
                    clearInterval(i);
                    clearTimeout(t);
                    resolve();
                }
            }.bind(this), this.options.waitForPoll);
        }.bind(this));
        return this;
    }
}

var create = function() {
    return new Haunt();
}

exports.create = create;
