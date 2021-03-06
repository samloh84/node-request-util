const _ = require('lodash');
const sprintf = require('sprintf-js').sprintf;
const Promise = require('bluebird');
const superagent = require('superagent');
const qs = require('qs');
const _cookie = require('cookie');
const CommonUtils = require('@lohsy84/common-utils');
const FileUtil = CommonUtils.FileUtil;
const StreamUtil = CommonUtils.StreamUtil;
const CryptoUtil = CommonUtils.CryptoUtil;
const _url = require("url");
const _path = require('path');
const moment = require('moment');

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
 * @param options.stream {string|Buffer|ReadStream}
 * @param options.auth {object}
 * @param options.auth.username {string}
 * @param options.auth.password {string}
 * @param options.auth.token {string}
 * @returns {Promise.<Response|object>}
 */
var sendRequest = function (options) {

    if (_.isString(options) || _.isArray(options)) {
        options = {url: options};
    }

    var url = _.get(options, 'url');
    var concurrency = _.get(options, 'concurrency', 10);

    if (_.isArray(url)) {
        return Promise.map(url, function (url) {
            return RequestUtil.sendRequest(_.merge({}, options, {url: url}));
        }, {concurrency: concurrency});
    }

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
    var outputStream = _.get(options, 'outputStream');
    var retries = _.get(options, 'retries', 0);
    var savePath = _.get(options, 'savePath');
    var cachePath = _.get(options, 'cachePath');
    var maxCacheTime = _.get(options, 'maxCacheTime', 10 * 60 * 1000);

    var username = _.get(options, 'auth.username') || _.get(options, 'username');
    var password = _.get(options, 'auth.password') || _.get(options, 'password');
    var token = _.get(options, 'auth.token') || _.get(options, 'token');

    var requestMethod = superagent[method];

    if (_.isNil(requestMethod)) {
        return Promise.reject(new Error("Invalid method: " + method));
    }

    if (!_.isNil(token) && !_.isEmpty(token)) {
        headers['Authorization'] = sprintf('Bearer %s', token);
    }

    if (!_.isNil(cookies) && !_.isEmpty(cookies)) {
        var serializedCookieHeader = [];
        _.each(cookies, function (value, key) {
            if (!_.isUndefined(value)) {
                serializedCookieHeader.push(_cookie.serialize(key, value));
            }
        });
        if (!_.isEmpty(serializedCookieHeader)) {
            headers['Cookie'] = serializedCookieHeader.join('; ');
        }
    }


    var cacheFilePath = null;
    if (!_.isNil(cachePath)) {
        var urlKey = _url.parse(url);
        delete urlKey['hash'];
        urlKey = _url.format(urlKey);
        urlKey = CryptoUtil.sha256(urlKey);

        cacheFilePath = _path.resolve(process.cwd(), cachePath, urlKey);
    }

    var streamPromise = null;
    if (!_.isNil(stream)) {
        if (_.isString(stream)) {
            streamPromise = FileUtil.createReadStream({path: stream});
        } else if (_.isBuffer(stream) || FileUtil.isReadStream(stream)) {
            streamPromise = Promise.resolve(stream);
        } else {
            return Promise.reject(new Error("Invalid parameter: stream"));
        }
    }

    var outputStreamPromise = null;
    if (!_.isNil(outputStream)) {
        if (FileUtil.isWriteStream(outputStream)) {
            outputStreamPromise = Promise.resolve(outputStream);
        } else {
            return Promise.reject(new Error("Invalid parameter: outputStream"));
        }
    }

    var postSaveResponse = false;

    if (!_.isNil(savePath)) {
        savePath = _path.resolve(process.cwd(), savePath);

        buffer = true;

        outputStreamPromise = FileUtil.stat({path: savePath})
            .catch(function (err) {
                if (err.code == 'ENOENT') {
                    return null;
                } else {
                    throw err;
                }
            })
            .then(function (stats) {
                if (!_.isNil(stats) && stats.isDirectory()) {
                    postSaveResponse = true;
                } else {
                    var savePathParentDirectory = _path.dirname(savePath);
                    return FileUtil.mkdirp({path: savePathParentDirectory})
                        .then(function () {
                            return FileUtil.createWriteStream({path: savePath});
                        })
                }
            })
    }


    var saveResponse = Promise.method(function (response) {
        var filename = null;
        var contentDispositionHeader = _.get(response.header, 'content-disposition');
        if (!_.isEmpty(contentDispositionHeader)) {
            var filenameMatches = /filename="([^"]+)"/.exec(contentDispositionHeader);
            if (!_.isNil(filenameMatches)) {
                filename = filenameMatches[1];
            }
        }

        if (_.isNil(filename)) {
            filename = _url.parse(url);
            filename = filename.pathname;
            filename = _path.basename(filename);
        }

        savePath = _path.resolve(savePath, filename);

        return FileUtil.writeFile({path: savePath, data: response.body});
    });


    var retrieve = Promise.method(function () {
        return Promise.props({stream: streamPromise, outputStream: outputStreamPromise})
            .then(function (props) {
                var stream = props.stream;
                var outputStream = props.outputStream;

                var request = requestMethod(url);

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

                if (!_.isNil(data) && !_.isEmpty(data)) {
                    _.each(data, function (value, key) {
                        if (!_.isUndefined(value)) {
                            request.send(_.set({}, key, value));
                        }
                    });
                }

                if (!_.isNil(attachments) && !_.isEmpty(attachments)) {
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
                }


                if (buffer) {
                    request.buffer();
                }

                return new Promise(function (resolve, reject) {
                    var errorHandler = function (err) {
                        if (redirects >= 0 && (err.status == 301 || err.status == 302)) {
                            return resolve(err.response);
                        } else {
                            if (err.name === 'SyntaxError') {
                                return resolve({text: err.rawResponse, statusCode: err.statusCode});
                            } else {
                                return reject(err);
                            }
                        }
                    };


                    if (!_.isNil(stream)) {
                        stream.once('error', function (err) {
                            return reject(err);
                        });

                        request.once('error', errorHandler);

                        stream.pipe(request);

                        if (!_.isNil(outputStream)) {
                            request.once('end', function () {
                                return resolve();
                            });

                            request.once('close', function () {
                                return resolve();
                            });

                            outputStream.once('error', function (err) {
                                return reject(err);
                            });

                            outputStream.once('end', function (err) {
                                return resolve();
                            });

                            outputStream.once('finish', function (err) {
                                return resolve();
                            });

                            request.pipe(outputStream);
                        } else {
                            request.once('response', function (response) {
                                return resolve(response);
                            });
                        }

                    } else {
                        if (!_.isNil(outputStream)) {
                            request.once('end', function () {
                                return resolve();
                            });

                            request.once('close', function () {
                                return resolve();
                            });

                            outputStream.once('error', function (err) {
                                return reject(err);
                            });

                            outputStream.once('end', function (err) {
                                return resolve();
                            });

                            outputStream.once('finish', function (err) {
                                return resolve();
                            });

                            request.pipe(outputStream);
                        } else {
                            request.end(function (error, response) {
                                if (error) {
                                    return errorHandler(error);
                                }

                                return resolve(response);
                            });
                        }
                    }


                });


            });
    });


    var retrieveCachedResponse = Promise.method(function () {
        if (!_.isNil(cacheFilePath)) {
            return FileUtil.exists({path: cacheFilePath})
                .then(function (fileExists) {
                    if (fileExists) {
                        return FileUtil.readFile({path: cacheFilePath})
                            .then(function (data) {
                                var cachedResponse = JSON.parse(data.toString());
                                var currentTimestamp = moment().valueOf();
                                var retrievedTimestamp = _.get(cachedResponse, 'timestamp');
                                var status = _.get(cachedResponse, 'status');
                                if (!_.isNil(status) && status === 200
                                    && !_.isNil(retrievedTimestamp) && currentTimestamp < (retrievedTimestamp + maxCacheTime)) {
                                    return cachedResponse;
                                }
                            })
                            .catch(function (err) {
                                return null;
                            })
                    }
                });
        }
    });

    var cacheResponse = Promise.method(function (response) {
        var cacheFileParentDirectory = _path.dirname(cacheFilePath);
        return FileUtil.mkdirp({path: cacheFileParentDirectory})
            .then(function () {
                var data = _.pick(response, ['status', 'header', 'body', 'text', 'type']);
                data = _.merge({}, data, {timestamp: moment().valueOf()});
                return FileUtil.writeFile({path: cacheFilePath, data: JSON.stringify(data)});
            })

    });


    return retrieveCachedResponse()
        .then(function (cachedResponse) {
            if (!_.isNil(cachedResponse)) {
                return cachedResponse;
            }

            var numTries = 0;

            function loop() {
                return retrieve()
                    .catch(function (err) {
                        numTries++;
                        if ((numTries + 1) < retries) {
                            return loop();
                        } else {
                            throw err;
                        }
                    })
            }


            return loop()
                .tap(function (response) {
                    if (!_.isNil(cacheFilePath)) {
                        cacheResponse(response);
                    }

                    if (postSaveResponse) {
                        saveResponse(response);
                    }
                });
        });
};

RequestUtil.request = RequestUtil.sendRequest = Promise.method(sendRequest);


/**
 *
 * @param response
 * @returns {Object.<string,string>}
 */
RequestUtil.parseResponseForCookies = function parseResponseForCookies(response) {
    var cookies = {};
    var cookieHeader = _.get(response, 'headers.set-cookie', []);
    _.each(cookieHeader, function (cookie) {
        _.assign(cookies, _cookie.parse(cookie));
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
