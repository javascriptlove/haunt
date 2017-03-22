/**
 * Haunt.js
 * 
 * A data mining library for PhantomJS.
 * 
 * https://github.com/javascriptlove/haunt/
 */

var webpage = require('webpage');
var fs = require('fs');

class Haunt {
    constructor(options) {
        this.options = {};
        this.options.waitForTimeout = 30000;
        this.options.waitForPoll = 100;
        this.options.log = false;
        if (typeof options === 'object') {
            if (options.log !== undefined) {
                this.options.log = !!options.log;
            }
            if (options.waitForTimeout) {
                this.options.waitForTimeout = options.waitForTimeout;
            }
            if (options.userAgent) {
                this.options.userAgent = options.userAgent;
            }
            if (options.blockIframes) {
                this.options.blockIframes = !!options.blockIframes;
            }
        }

        if (!this.options.log) {
            this.log = function() { }; // reset to nothing
        }
            
        this.dataStorage = {};
        this.actions = [];
        this.currentAction = 0;
        this.processing = false;
        this.page = webpage.create();

        this.page.onConsoleMessage = this.onConsoleMessage;
        this.page.onError = this.onError;

        if (this.options.userAgent) {
            this.page.settings.userAgent = this.options.userAgent; 
        }
        if (this.options.blockIframes) {
            this.page.onLoadStarted = function() {
                var url = page.evaluate(function() {
                    return window.location.href;
                });
                if (this.requestedUrl != url) {
                    this.page.navigationLocked = true;
                }
            }.bind(this); 
        }

        this.page.settings.loadImages = !!this.options.loadImages;
        this.page.settings.clearMemoryCaches = true;

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
    _onResolve() {
        // resolve
        this.currentAction++;
        this.processing = false;
        if (this.currentAction < this.actions.length) {
            this._run();
        }
    }
    _onReject() {
        // reject
        var args = Array.prototype.slice.call(arguments);
        var s = 'Error while performing step #' + (this.currentAction+1);
        if (args.length) {
            s += "\n" + args[0] + '(';
            args.splice(0, 1);
            args = args.map(function(arg) {
                if (typeof arg === 'function' || typeof arg === 'object') {
                    return '[' + typeof arg + ']';
                }
                return JSON.stringify(arg);
            });
            s += args.join(', ');
            s += ')';
        }
        this.fatal(s);
    }
    _run() {
        this.processing = true;
        this.actions[this.currentAction](this._onResolve.bind(this), this._onReject.bind(this));
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
            func.call(this, resolve.bind(this));
            // if callback accepts arguments, this means it should run done() when ready
            if (func.length === 0) {
                resolve();
            }
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
        console.error('\x1b[31mFATAL ERROR: ' + message + '\x1b[0m');
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
    doToFileCSV(key, file) {
        var data = this.getData(key);
        var separator = ',';
        var delimiter = '"';
        var stream = fs.open(file, 'w');
        var headers = [];
        data.forEach(function(item, i) {
            if (i === 0) {
                // headers
                headers = Object.keys(item);
                var keys = headers.map(function(key) {
                    return delimiter + key + delimiter;
                });
                stream.write(keys.join(separator));
            }
            var values = [];
            headers.forEach(function(key) {
                values.push(delimiter + String(item[key]).replace(new RegExp('/' + delimiter + '/', 'g'), '\\' + delimiter) + delimiter);
            });
            stream.write("\n" + values.join(separator));
        }, this);
        stream.close();
        return data.length;
    }
    doToFileJSON(key, file) {
        var data;
        if (typeof file === 'undefined') {
            // optional [key] parameter
            data = this.dataStorage;
            file = key;
        } else {
            data = this.getData(key);
        }
        fs.write(file, JSON.stringify(data, true, 2), 'w');
    }
    getAttr(selector, attr) {
        return this.page.evaluate(function(selector, attr) {
            var element = document.querySelector(selector);
            if (element) {
                return element.getAttribute(attr);
            }
        }, selector, attr);
    }
    getExists(selector) {
        return this.page.evaluate(function(selector) {
            var element = document.querySelector(selector);
            return !!element;
        }, selector);
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
    getComputedStyle(selector, style) {
        return this.page.evaluate(function(selector, style) {
            var element = document.querySelector(selector);
            if (element) {
                var computed = getComputedStyle(element);
                return computed[style];
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
    computedStyle(selector, style, func) {
        this.check(selector, 'string');
        this.check(style, 'string');
        this.check(func, 'function');
        this._push(function(resolve, reject) {
            func.call(this, this.getComputedStyle(selector, style));
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
            this.requestedUrl = url;
            this.page.clearMemoryCache();
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
    exists(selector, func) {
        this.check(selector, 'string');
        this.check(func, 'function');
        this._push(function(resolve, reject) {
            func.call(this, this.getExists(selector));
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
    /**
     * Output array of data to file
     *
     * @param {string} key - key name as stored in data
     * @param {string} file - path to a file
     */
    toFileCSV(key, file) {
        this.check(key, 'string');
        this.check(file, 'string');
        this._push(function(resolve, reject) {
            this.doToFileCSV.call(this, key, file);
            resolve();
        }.bind(this));
        return this;
    }
    /**
     * Output array of data or object to file. If key parameter is omitted, outputs everything from data to file.
     *
     * @param {string} [key] - key name as stored in data
     * @param {string} file - path to a file
     */
    toFileJSON(key, file) {
        this.check(key, 'string');
        this._push(function(resolve, reject) {
            this.doToFileJSON.call(this, key, file);
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
                reject('waitFor', selector, ms);
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

var create = function(options) {
    return new Haunt(options);
}

exports.create = create;
