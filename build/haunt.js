'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
Haunt.js
https://github.com/javascriptlove/haunt/
*/

var webpage = require('webpage');

var Haunt = function () {
    function Haunt(options) {
        _classCallCheck(this, Haunt);

        this.options = {};
        if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object') {
            this.options.log = options.log === true;

            if (!this.options.log) {
                this.log = function () {}; // reset to nothing
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


    _createClass(Haunt, [{
        key: '_push',
        value: function _push(action) {
            this.actions.push(action);
            if (!this.processing) {
                this._run();
            }
        }
    }, {
        key: '_run',
        value: function _run() {
            var that = this;
            this.processing = true;
            this.actions[0](function () {
                that.actions.splice(0, 1);
                that.processing = false;
                if (that.actions.length) {
                    that._run();
                }
            }, function () {
                that.fatal('Error while performing step');
            });
        }
    }, {
        key: 'log',
        value: function log(message) {
            console.log(message);
            return this;
        }
    }, {
        key: 'then',
        value: function then(func) {
            if (typeof func !== 'function') {
                this.fatal('Parameter for `then` is not a function');
            }
            var that = this;
            this._push(function (resolve, reject) {
                func.call(that);
                resolve();
            });
            return this;
        }
    }, {
        key: 'end',
        value: function end() {
            this._push(function (resolve, reject) {
                phantom.exit();
            });
        }
    }, {
        key: 'fatal',
        value: function fatal(message) {
            console.error('FATAL ERROR: ' + message);
            phantom.exit();
        }
    }, {
        key: 'setData',
        value: function setData(key, value) {
            this.dataStorage[key] = value;
            return this;
        }
    }, {
        key: 'getData',
        value: function getData(key) {
            if (typeof key !== 'undefined') {
                return this.dataStorage[key];
            } else {
                return this.dataStorage;
            }
        }
        /* 
        Alias for getData(); but can be used without brackets
        */

    }, {
        key: 'onConsoleMessage',
        value: function onConsoleMessage(msg, line, source) {
            console.log(msg + ' line #' + line);
        }
    }, {
        key: 'onError',
        value: function onError(msg, trace) {
            console.error(msg);
        }

        /*
        Synchronous APIs
        */

    }, {
        key: 'getTitle',
        value: function getTitle() {
            return this.page.evaluate(function () {
                if (document) {
                    return document.title;
                }
            });
        }
    }, {
        key: 'getURL',
        value: function getURL() {
            return this.page.evaluate(function () {
                return window.location.toString();
            });
        }
    }, {
        key: 'getHtml',
        value: function getHtml(selector) {
            return this.page.evaluate(function (selector) {
                var element = document.querySelector(selector);
                if (element) {
                    return element.innerHTML;
                }
            }, selector);
        }
    }, {
        key: 'getHtmlMappingAll',
        value: function getHtmlMappingAll(selector, props) {
            return this.page.evaluate(function (selector) {
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
    }, {
        key: 'getHtmlAll',
        value: function getHtmlAll(selector, attribute, props) {
            this.page.evaluate(this.phantomDataFilter);
            if ((typeof attribute === 'undefined' ? 'undefined' : _typeof(attribute)) === 'object' && typeof props === 'undefined') {
                props = attribute;
                attribute = '';
            }
            return this.page.evaluate(function (selector, attribute, props) {
                var result = [];
                var selector = selector.split('->');
                var elements = document.querySelectorAll(selector[0]);
                if (elements.length) {
                    for (var i = 0; i < elements.length; i++) {
                        if (props) {
                            var result_inner = {};
                            for (var p in props) {
                                // check if it's an array
                                // first item in array of props is selector
                                var prop = props[p].split('->');
                                var elem = elements[i].querySelector(prop[0]);
                                if (elem) {
                                    result_inner[p] = elem.innerHTML;
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
                            var result_inner = elements[i].innerHTML;
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
    }, {
        key: 'phantomDataFilter',
        value: function phantomDataFilter() {
            window.phantomDataFilter = function (what, filters) {
                what = String(what); // is it ok to do like this?
                for (var a = 0; a < filters.length; a++) {
                    var filter = String(filters[a]).trim();
                    if (filter == 'removeWhitespace') {
                        what = what.replace(/\s/g, '');
                    }if (filter == 'number') {
                        what = parseInt(what, 10);
                    } else if (filter == 'decimal' || filter == 'float') {
                        what = parseFloat(what, 10);
                    } else if (filter == 'trim') {
                        what = what.trim();
                    }
                }
                return what;
            };
        }
    }, {
        key: 'doClick',
        value: function doClick(selector) {
            return this.page.evaluate(function (selector) {
                // http://stackoverflow.com/a/17789929/266561
                if (!HTMLElement.prototype.click) {
                    HTMLElement.prototype.click = function () {
                        var ev = document.createEvent('MouseEvent');
                        ev.initMouseEvent('click',
                        /*bubble*/true, /*cancelable*/true, window, null, 0, 0, 0, 0, /*coordinates*/
                        false, false, false, false, /*modifier keys*/
                        0 /*button=left*/, null);
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

    }, {
        key: 'get',
        value: function get(url) {
            var that = this;
            this._push(function (resolve, reject) {
                that.page.open(url, function (status) {
                    resolve(status);
                });
            });
            return this;
        }
    }, {
        key: 'post',
        value: function post(url, data) {
            return this;
        }
    }, {
        key: 'url',
        value: function url(func) {
            if (typeof func !== 'function') {
                this.fatal('Parameter for `url` is not a function');
            }
            var that = this;
            that._push(function (resolve, reject) {
                func.call(that, that.getURL());
                resolve();
            });
            return this;
        }
    }, {
        key: 'title',
        value: function title(func) {
            if (typeof func !== 'function') {
                this.fatal('Parameter for `title` is not a function');
            }
            var that = this;
            that._push(function (resolve, reject) {
                func.call(that, that.getTitle());
                resolve();
            });
            return this;
        }
    }, {
        key: 'html',
        value: function html(selector, func) {
            if (typeof selector !== 'string') {
                this.fatal('First parameter for `html` is not a string');
            }
            if (typeof func !== 'function') {
                this.fatal('Second parameter for `html` is not a function');
            }
            var that = this;
            this._push(function (resolve, reject) {
                func.call(that, that.getHtml(selector));
                resolve();
            });
            return this;
        }
    }, {
        key: 'dataList',
        value: function dataList(key, selector, attribute, props) {
            if (typeof selector !== 'string') {
                this.fatal('First parameter for `dataList` is not a string');
            }
            if (typeof key !== 'string') {
                this.fatal('Second parameter for `dataList` is not a string');
            }
            if (typeof props !== 'undefined' && (typeof props === 'undefined' ? 'undefined' : _typeof(props)) !== 'object') {
                this.fatal('Third parameter for `dataList` is not an object');
            }
            var that = this;
            this._push(function (resolve, reject) {
                var results = that.getHtmlAll(selector, attribute, props);
                that.setData(key, results);
                resolve();
            });
            return this;
        }
    }, {
        key: 'click',
        value: function click(selector) {
            var that = this;
            this._push(function (resolve, reject) {
                that.doClick(selector);
                resolve();
            });
            return this;
        }
    }, {
        key: 'wait',
        value: function wait(ms) {
            var that = this;
            this._push(function (resolve, reject) {
                setTimeout(function () {
                    resolve();
                }, ms);
            });
            return this;
        }
    }, {
        key: 'data',
        get: function get() {
            return this.getData();
        }
    }]);

    return Haunt;
}();

var create = function create() {
    return new Haunt();
};

exports.create = create;