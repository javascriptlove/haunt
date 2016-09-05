/*
Haunt.js
https://github.com/javascriptlove/haunt/
*/

var webpage = require('webpage');

class Haunt {
    constructor(options) {
        this.options = {};
        if (typeof options === 'object') {
            this.options.log = (options.log === true);

            if (!this.options.log) {
                this.log = function() { }; // reset to nothing
            }
        }
        this.dataStorage = {};
        this.actions = [];
        this.processing = false;
        this.page = webpage.create();

        this.page.onConsoleMessage = this.onConsoleMessage;
        this.page.onError = this.onError;

        // aliases for usability and memory relaxing
        this.open = this.goto = this.go = this.get;
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
    end() {
        this._push(function(resolve, reject) {
            phantom.exit();
        });
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
        console.log(msg + ' line #' + line);
    }
    onError(msg, trace) {
        console.error(msg);
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
    getHtml(selector) {
        return this.page.evaluate(function(selector) {
            var element = document.querySelector(selector);
            if (element) {
                return element.innerHTML;
            }
        }, selector);
    }
    getHtmlMappingAll(selector, props) {
        return this.page.evaluate(function(selector) {
            var result = [];
            var elements = document.querySelectorAll(selector);
            if (elements.length) {
                for (var i = 0; i < elements.length; i++) {
                    result.push(elements[i].innerHTML);
                }
            }
            return result;
        }, selector, props);
    }
    getHtmlAll(selector, props) {
        return this.page.evaluate(function(selector, props) {
            var result = [];
            var elements = document.querySelectorAll(selector);
            if (elements.length) {
                for (var i = 0; i < elements.length; i++) {
                    if (props) {
                        var result_inner = {};
                        for (var p in props) {
                            var elem = elements[i].querySelector(props[p]);
                            if (elem) {
                                result_inner[p] = elem.innerHTML;
                            } else {
                                result_inner[p] = '';
                            }
                        }
                        result.push(result_inner);
                    } else {
                        result.push(elements[i].innerHTML);
                    }
                }
            }
            return result;
        }, selector, props);
    }
    getHtmlAttrAll(selector, attribute, props) {
        return this.page.evaluate(function(selector, attribute) {
            var result = [];
            var elements = document.querySelectorAll(selector);
            if (elements.length) {
                for (var i = 0; i < elements.length; i++) {
                    result.push(elements[i].getAttribute(attribute));
                }
            }
            return result;
        }, selector, attribute);
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
    dataList(key, selector, props) {
        if (typeof selector !== 'string') {
            this.fatal('First parameter for `dataList` is not a string');
        }
        if (typeof key !== 'string') {
            this.fatal('Second parameter for `dataList` is not a string');
        }
        if (typeof props !== 'undefined' && typeof props !== 'object') {
            this.fatal('Third parameter for `eachDataList` is not an object');
        }
        var that = this;
        this._push(function(resolve, reject) {
            var results = that.getHtmlAll(selector, props);
            that.setData(key, results);
            resolve();
        });
        return this;
    }
    dataAttributeList(key, selector, attribute) {
        if (typeof selector !== 'string') {
            this.fatal('First parameter for `dataAttributeList` is not a string');
        }
        if (typeof attribute !== 'string') {
            this.fatal('Second parameter for `dataAttributeList` is not a string');
        }
        if (typeof key !== 'string') {
            this.fatal('Third parameter for `dataAttributeList` is not a string');
        }
        var that = this;
        this._push(function(resolve, reject) {
            var results = that.getHtmlAttrAll(selector, attribute);
            that.setData(key, results);
            resolve();
        });
        return this;
    }
}

var create = function() {
    return new Haunt();
}

exports.create = create;
