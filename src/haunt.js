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
        this.options.autoReturn = false;
        if (typeof options === 'object') {
            if (options.log !== undefined) {
                this.options.log = !!options.log;
            }
            if (options.autoReturn !== undefined) {
                this.options.autoReturn = !!options.autoReturn;                
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
        } else if (this.options.autoReturn) {
            this.return();
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
    doAjax(method, url, data, resolve, reject) {
        var ajaxName = 'ajax' + Math.ceil(Math.random() * 1000000);
        this.page.evaluate(function(ajaxName, method, url, data) {
            var xhr = new XMLHttpRequest();
            xhr.open(method.toUpperCase(), url, true);
            xhr.send(data);
            window[ajaxName] = xhr;
        }, ajaxName, method, url, data);
        this.doWaitFor(function() {
            // resolve
            resolve(this.page.evaluate(function(ajaxName) {
                return {
                    status: window[ajaxName].status,
                    headers: window[ajaxName].getAllResponseHeaders().split("\r\n"),
                    response: window[ajaxName].response,
                    responseText: window[ajaxName].responseText,
                    responseXML: window[ajaxName].responseXML,
                    readyState: window[ajaxName].readyState
                };
            }, ajaxName));
        }.bind(this), reject, null, function(ajaxName) {
            return window[ajaxName].readyState == 4; // Done
        }, ajaxName);
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
    doGetValue(selector) {
        this.log('Getting value for ' + selector);
        return this.page.evaluate(function(selector) {
            var element = document.querySelector(selector);
            if (element) {
                return element.value;
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
        this.doWriteFile(file, JSON.stringify(data, true, 2));
    }
    doWaitFor(resolve, reject, ms, /* , args */) {
        var args = Array.prototype.slice.call(arguments, 3);
        var t = setTimeout(function() {
            this.log('Timeout in waitFor, rejecting');
            clearInterval(i);
            reject.apply(this, ['waitFor'].concat(args));
        }.bind(this), ms || this.options.waitForTimeout);
        var i = setInterval(function() {
            var result = this.page.evaluate.apply(this.page, args);
            if (result) {
                clearInterval(i);
                clearTimeout(t);
                resolve();
            }
        }.bind(this), this.options.waitForPoll);
    }
    doWriteFile(file, contents, mode='w') {
        fs.write(file, contents, mode);
    }
    doSetValue(selector, value) {
        this.log('Setting value ' + value + ' for ' + selector);
        return this.page.evaluate(function(selector, value) {
            var element = document.querySelector(selector);
            if (element) {
                return element.setAttribute('value', value);
            }
        }, selector, value);
    }
    getAttr(selector, attr) {
        this.log('Getting attribute ' + attr + ' for ' + selector);
        return this.page.evaluate(function(selector, attr) {
            var element = document.querySelector(selector);
            if (element) {
                return element.getAttribute(attr);
            }
        }, selector, attr);
    }
    getExists(selector) {
        this.log('Checking existense of ' + selector);
        return this.page.evaluate(function(selector) {
            var element = document.querySelector(selector);
            return !!element;
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
    getProperty(selector, property) {
        this.log('Getting ' + property + ' of ' + selector);
        return this.page.evaluate(function(selector, property) {
            var element = document.querySelector(selector);
            if (element) {
                return element[property];
            } else {
                return undefined;
            }
        }, selector, property);
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

    /**
     * TODO: GET/POST data to url
     * 
     * Ajax request with XMLHttpRequest
     */
    ajax(method, url, data, func) {
        this.check(method, 'string');
        this.check(url, 'string');
        if (typeof data === 'function') {
            func = data;
            data = null;
        }
        this._push(function(resolve, reject) {
            this.doAjax(method, url, data, function(results) {
                func.call(this, results);
                resolve();
            }.bind(this), reject);
        }.bind(this));
        return this;
    }
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
            this.log('Clicking ' + selector);
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
    evaluate(/*func, .. args, callback */) {
        this.check(arguments[0], 'function');
        var args = Array.prototype.slice.apply(arguments);
        var callback = null;
        if (arguments.length > 1 && typeof arguments[arguments.length-1] === 'function') {
            callback = args.splice(args.length-1, 1)[0];
        }
        this._push(function(resolve, reject) {
            var result = this.page.evaluate.apply(this.page, args);
            if (callback) {
                callback(result);
            }
            resolve();
        }.bind(this));
        return this;
    }
    get(url) {
        this._push(function(resolve, reject) {
            this.log('Loading URL ' + url);
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
            func.call(this, this.getProperty(selector, 'innerHTML'));
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
    property(selector, property, func) {
        this.check(selector, 'string');
        this.check(property, 'string');
        this.check(func, 'function');
        this._push(function(resolve, reject) {
            func.call(this, this.getProperty(selector, property));
            resolve();
        }.bind(this));
        return this;
    }
    setValue(selector, value) {
        this.check(selector, 'string');
        this.check(value, 'string');
        this._push(function(resolve, reject) {
            this.doSetValue.call(this, selector, value);
            resolve();
        }.bind(this));
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
    text(selector, func) {
        this.check(selector, 'string');
        this.check(func, 'function');
        this._push(function(resolve, reject) {
            func.call(this, this.getProperty(selector, 'innerText'));
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
    value(selector, func) {
        this.check(selector, 'string');
        this.check(func, 'function');
        this._push(function(resolve, reject) {
            func.call(this, this.doGetValue(selector));
            resolve();
        }.bind(this));
        return this;
    }
    wait(ms) {
        this._push(function(resolve, reject) {
            this.log('Waiting for ' + ms + 'ms');
            setTimeout(function() {
                resolve();
            }, ms);
        }.bind(this));
        return this;
    }
    waitFor(selector, ms) {
        this._push(function(resolve, reject) {
            this.log('Waiting for ' + selector);
            this.doWaitFor(resolve, reject, ms, function(selector) {
                return !!document.querySelector(selector);
            }, selector);
        }.bind(this));
        return this;
    }
    waitForFalse(selector, ms) {
        this._push(function(resolve, reject) {
            this.log('Waiting for non-existence of ' + selector);
            this.doWaitFor(resolve, reject, ms, function(selector) {
                return !document.querySelector(selector);
            }, selector);
        }.bind(this));
        return this;
    }
}

var create = function(options) {
    return new Haunt(options);
}

exports.create = create;
