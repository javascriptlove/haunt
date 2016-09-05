'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
Haunt.js
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
        key: 'getHtmlAll',
        value: function getHtmlAll(selector) {
            return this.page.evaluate(function (selector) {
                var result = [];
                var elements = document.querySelectorAll(selector);
                if (elements.length) {
                    for (var i = 0; i < elements.length; i++) {
                        result.push(elements[i].innerHTML);
                    }
                }
                return result;
            }, selector);
        }
    }, {
        key: 'getHtmlAttrAll',
        value: function getHtmlAttrAll(selector, attribute) {
            return this.page.evaluate(function (selector, attribute) {
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
        value: function dataList(selector, key) {
            if (typeof selector !== 'string') {
                this.fatal('First parameter for `dataList` is not a string');
            }
            if (typeof key !== 'string') {
                this.fatal('Second parameter for `dataList` is not a string');
            }
            var that = this;
            this._push(function (resolve, reject) {
                var results = that.getHtmlAll(selector);
                that.setData(key, results);
                resolve();
            });
            return this;
        }
    }, {
        key: 'dataAttributeList',
        value: function dataAttributeList(selector, attribute, key) {
            if (typeof selector !== 'string') {
                this.fatal('First parameter for `dataList` is not a string');
            }
            if (typeof attribute !== 'string') {
                this.fatal('Second parameter for `dataList` is not a string');
            }
            if (typeof key !== 'string') {
                this.fatal('Third parameter for `dataList` is not a string');
            }
            var that = this;
            this._push(function (resolve, reject) {
                var results = that.getHtmlAttrAll(selector, attribute);
                that.setData(key, results);
                resolve();
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
