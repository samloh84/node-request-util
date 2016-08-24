const _ = require('lodash');
const sprintf = require('sprintf-js').sprintf;
const Promise = require('bluebird');
const superagent = require('superagent');
const qs = require('qs');
const cookie = require('cookie');
var fs = require("fs");
var _path = require("path");
var _url = require("url");

var RequestUtil = {};

/**
 *
 * @param options {object}
 * @param options.url {string}
 * @param options.type {string}
 * @param options.buffer {boolean}
 * @param options.method {string}
 * @param options.cookies {Object.<string, string>}
 * @param options.headers {Object.<string, string>}
 * @param options.query {Object.<string, string>}
 * @param options.data {Object.<string, string>}
 * @param options.attachments {Object.<string, string|{path:string,filename:string}>}
 * @param options.redirects {number}
 * @param options.stream {string|Buffer}
 * @param options.auth {object}
 * @param options.auth.username {string}
 * @param options.auth.password {string}
 * @param options.auth.token {string}
 * @returns {Promise.<Response>}
 */
RequestUtil.request = RequestUtil.sendRequest = function (options) {
    return new Promise(function (resolve, reject) {


        var url = _.get(options, 'url');
        var type = _.get(options, 'type');
        var method = _.get(options, 'method', 'get');
        var cookies = _.get(options, 'cookies', {});
        var headers = _.get(options, 'headers', {});
        var query = _.get(options, 'query', {});
        var data = _.get(options, 'data', {});
        var buffer = _.get(options, 'buffer');
        var attachments = _.get(options, 'attachments', {});
        var redirects = _.get(options, 'redirects', 0);
        var stream = _.get(options, 'stream');
        var username = _.get(options, 'auth.username') || _.get(options, 'username');
        var password = _.get(options, 'auth.password') || _.get(options, 'password');
        var token = _.get(options, 'auth.token') || _.get(options, 'token');

        var request = superagent[method](url);

        if (redirects >= 0) {
            request.redirects(redirects);
        }

        if (!_.isNil(type) && !_.isEmpty(type)) {
            request.type(type);
        }

        if (!_.isNil(username) && !_.isEmpty(username)
            && !_.isNil(password) && !_.isEmpty(password)) {
            request.auth(username, password);
        }

        if (!_.isNil(token) && !_.isEmpty(token)) {
            headers['Authorization'] = sprintf('Bearer %s', token);
        }

        if (!_.isNil(cookies) && !_.isEmpty(cookies)) {
            headers['Cookie'] = _.reduce(cookies, function (accumulator, value, key) {
                if (!_.isUndefined(value)) {
                    accumulator.push(cookie.serialize(key, value));
                }
            }, []).join('; ');
        }


        if (!_.isNil(headers) && !_.isEmpty(headers)) {
            _.each(headers, function (value, key) {
                if (!_.isUndefined(value)) {
                    request.set(key, value);
                }
            });
        }


        if (!_.isNil(query) && !_.isEmpty(query)) {
            _.each(query, function (value, key) {
                if (!_.isUndefined(value)) {
                    request.query(_.set({}, key, value));
                }
            });
        }

        if (buffer) {
            request.buffer();
        }


        if (stream) {
            if (_.isString(stream)) {
                try {
                    stream = fs.createReadStream(_path.resolve(process.cwd(), stream));
                    stream.on('open', function () {
                        stream.pipe(request);
                    });

                    stream.on('error', function () {
                        return reject(err);
                    });

                } catch (err) {
                    return reject(err);
                }
            }

            request.on('response', function (response) {
                return resolve(response);
            });

            request.on('error', function (error) {
                if (error) {
                    if (redirects <= 0 && (error.status == 301 || error.status == 302)) {
                        return resolve(error.response);
                    } else {
                        if (error.name === 'SyntaxError') {
                            return resolve({text: error.rawResponse, statusCode: error.statusCode});
                        } else {
                            return reject(error);
                        }
                    }
                }
            })


        } else {

            _.each(data, function (value, key) {
                if (!_.isUndefined(value)) {
                    request.send(_.set({}, key, value));
                }
            });


            _.each(attachments, function (value, key) {
                if (!_.isUndefined(value)) {
                    var filePath = value;
                    var filename = undefined;
                    if (_.isPlainObject(value)) {
                        filePath = _.get(value, 'path');
                        filename = _.get(value, 'filename');
                    }
                    request.attach(key, filePath, filename);
                }
            });

            request.end(function (error, response) {
                if (error) {
                    if (redirects <= 0 && (error.status == 301 || error.status == 302)) {
                        return resolve(error.response);
                    } else {
                        if (error.name === 'SyntaxError') {
                            return resolve({text: error.rawResponse, statusCode: error.statusCode});
                        } else {
                            return reject(error);
                        }
                    }
                }

                return resolve(response);
            })
        }

    });
};


/**
 *
 * @param response
 * @returns {Object.<string,string>}
 */
RequestUtil.parseResponseForCookies = function parseResponseForCookies(response) {
    var cookies = {};
    var cookieHeader = _.get(response, 'headers.set-cookie', []);
    _.each(cookieHeader, function (cookie) {
        _.assign(cookies, cookie.parse(cookie));
    });
    return cookies;
};

/**
 *
 * @param response
 * @returns {{url: string, queryParameters: {}, hashParameters: Object.<string,string>, cookies:  Object.<string,string>}}
 */
RequestUtil.parseRedirectResponse = function parseRedirectResponse(response) {

    if (response.status != 301 && response.status != 302) {
        throw new Error("Invalid state");
    }

    var urlInfo = parseRedirectUrl(response.headers['location']);
    var cookies = parseResponseForCookies(response);

    return _.merge({}, urlInfo, {cookies: cookies});
};

/**
 *
 * @param redirectUrl
 * @returns {{url: string, queryParameters: {}, hashParameters: Object.<string,string>}}
 */
RequestUtil.parseRedirectUrl = function parseRedirectUrl(redirectUrl) {

    var parsedUrl = _url.parse(redirectUrl, true);

    var queryParameters = parsedUrl.query || {};
    var hash = parsedUrl.hash;
    var hashParameters;
    if (!_.isNil(hash) && hash !== '') {
        hashParameters = qs.parse(hash.substring(1));
    } else {
        hashParameters = {};
    }

    return {url: redirectUrl, queryParameters: queryParameters, hashParameters: hashParameters};

};

module.exports = RequestUtil;
