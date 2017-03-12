const Promise = require('bluebird');
const _ = require('lodash');
const _url = require('url');
const http = require('http');
const https = require('https');
const _path = require("path");
const fs = require("fs");
const FormData = require('form-data');
const qs = require('qs');
const formidable = require("formidable");


var HttpUtil = {};

// TODO: Handle cookies
// TODO: Handle redirects

/**
 *
 * @param options
 * @param options.url
 * @param options.protocol
 * @param options.host
 * @param options.hostname
 * @param options.port
 * @param options.localAddress
 * @param options.path
 * @param options.family
 * @param options.socketPath
 * @param options.method
 * @param options.headers
 * @param options.auth
 * @param options.agent
 * @param options.createConnection
 * @param options.timeout
 * @param options.pfx
 * @param options.key
 * @param options.passphrase
 * @param options.cert
 * @param options.ca
 * @param options.ciphers
 * @param options.rejectUnauthorized
 * @param options.secureProtocol
 * @param options.servername
 * @param options.getStream
 * @param options.inputStream
 *
 */
HttpUtil.request = function (options) {
    return new Promise(function (resolve, reject) {
        try {
            if (_.isString(arguments[0])) {
                options = arguments[1] || {};
                options.url = arguments[0];
            }

            var url = _.get(options, 'url');

            var protocol, host, hostname, port, localAddress, path;
            if (!_.isNil(url)) {
                var urlObject = _url.parse(url);
                protocol = urlObject.protocol;
                host = urlObject.host;
                hostname = urlObject.hostname;
                port = urlObject.port;
                localAddress = urlObject.localAddress;
                path = urlObject.path;
            }
            else {
                protocol = _.get(options, 'protocol');
                host = _.get(options, 'host');
                hostname = _.get(options, 'hostname');
                port = _.get(options, 'port');
                localAddress = _.get(options, 'localAddress');
                path = _.get(options, 'path');
            }

            var family = _.get(options, 'family');
            var socketPath = _.get(options, 'socketPath');
            var method = _.get(options, 'method');
            var headers = _.get(options, 'headers');
            var auth = _.get(options, 'auth');
            var agent = _.get(options, 'agent');
            var createConnection = _.get(options, 'createConnection');
            var timeout = _.get(options, 'timeout');


            var pfx = _.get(options, 'pfx');
            var key = _.get(options, 'key');
            var passphrase = _.get(options, 'passphrase');
            var cert = _.get(options, 'cert');
            var ca = _.get(options, 'ca');
            var ciphers = _.get(options, 'ciphers');
            var rejectUnauthorized = _.get(options, 'rejectUnauthorized');
            var secureProtocol = _.get(options, 'secureProtocol');
            var servername = _.get(options, 'servername');


            var query = _.get(options, 'query');
            var data = _.get(options, 'data');
            var attachments = _.get(options, 'attachments');

            var buffer = _.get(options, 'buffer');
            var getStream = _.get(options, 'getStream');
            var inputStream = _.get(options, 'inputStream');
            var outputStream = _.get(options, 'outputStream');
            var throwOnHttpError = _.get(options, 'throwOnHttpError', true);
            var followRedirects = _.get(options, 'followRedirects', true);


            if (!_.isNil(query)) {

                if (_.isString(query)) {
                    query = qs.parse(query);
                }

                var queryStringIndex = path.indexOf('?');
                var queryObject;
                if (queryStringIndex == -1) {
                    queryObject = {};
                } else {
                    queryObject = qs.parse(path.slice(queryStringIndex + 1));
                    path = path.slice(0, queryStringIndex);
                }
                
                _.assign(queryObject, query);

                path = path + '?' + qs.stringify(queryObject);
            }


            var requestOptions = {
                protocol: protocol,
                host: host,
                hostname: hostname,
                family: family,
                port: port,
                localAddress: localAddress,
                socketPath: socketPath,
                method: method,
                path: path,
                headers: headers,
                auth: auth,
                agent: agent,
                createConnection: createConnection,
                timeout: timeout,
                pfx: pfx,
                key: key,
                passphrase: passphrase,
                cert: cert,
                ca: ca,
                ciphers: ciphers,
                rejectUnauthorized: rejectUnauthorized,
                secureProtocol: secureProtocol,
                servername: servername
            };

            requestOptions = _.omitBy(requestOptions, _.isUndefined);

            var callback = function (response) {
                var responseObject = {
                    complete: _.get(response, 'complete'),
                    headers: _.get(response, 'headers'),
                    httpVersion: _.get(response, 'httpVersion'),
                    httpVersionMajor: _.get(response, 'httpVersionMajor'),
                    httpVersionMinor: _.get(response, 'httpVersionMinor'),
                    method: _.get(response, 'method'),
                    rawHeaders: _.get(response, 'rawHeaders'),
                    rawTrailers: _.get(response, 'rawTrailers'),
                    statusCode: _.get(response, 'statusCode'),
                    statusMessage: _.get(response, 'statusMessage'),
                    trailers: _.get(response, 'trailers'),
                    upgrade: _.get(response, 'upgrade'),
                    url: _.get(response, 'url')
                };

                if (responseObject.statusCode >= 300 && responseObject.statusCode < 400 && (followRedirects === true || _.isNumber(followRedirects) && followRedirects > 0)) {
                    var redirectResponseObjects = [responseObject];

                    var followRedirect = function (responseObject) {
                        var redirectUrl = _url.resolve(_url.format({
                            protocol: protocol,
                            host: host,
                            hostname: hostname,
                            family: family,
                            port: port,
                            localAddress: localAddress,
                            socketPath: socketPath
                        }), _.get(responseObject, 'headers.location'));

                        var redirectRequestOptions = _.assign({}, requestOptions, {
                            url: redirectUrl,
                            followRedirects: false
                        });

                        return HttpUtil.request(redirectRequestOptions)
                            .then(function (redirectResponseObject) {
                                if ([301, 302, 303, 307, 308].indexOf(redirectResponseObject.statusCode) == -1) {
                                    redirectResponseObject.redirects = redirectResponseObjects;
                                    return resolve(redirectResponseObject);
                                } else if (followRedirects === true || redirectResponseObjects.length < followRedirects) {
                                    redirectResponseObjects.push(redirectResponseObject);
                                    return followRedirect(redirectResponseObject);
                                }
                            })
                            .catch(function (err) {
                                return reject(err)
                            });
                    };

                    return followRedirect(responseObject);

                }


                if (getStream) {
                    responseObject.stream = response;
                }

                if (!_.isNil(outputStream)) {
                    if (_.isString(outputStream)) {
                        outputStream = fs.createWriteStream(_path.resolve(process.cwd(), outputStream));
                    }
                    outputStream.on('finish', function () {
                        return resolve(responseObject);
                    });
                    return response.pipe(outputStream);
                }

                var contentType = _.get(response.headers, 'content-type');

                var isText = false, isJson = false, isUrlEncoded = false, isMultipart = false;

                if (!_.isNil(contentType)) {
                    var contentTypeComponents = contentType.split(/[/;\s]/g);

                    isText = contentTypeComponents[0] == "text";
                    isJson = contentTypeComponents[1].indexOf("json") != -1;
                    isUrlEncoded = contentTypeComponents[1] == 'x-www-form-urlencoded';
                    isMultipart = contentTypeComponents[0] == "multipart" && contentTypeComponents[1] == "form-data";
                }

                if (isText || isJson || isUrlEncoded) {
                    buffer = true;
                }

                if (buffer) {
                    var chunks = [];

                    response.on('data', function (chunk) {
                        chunks.push(chunk);
                    });

                    response.on('end', function () {
                        responseObject.buffer = Buffer.concat(chunks);

                        if (isText || isJson || isUrlEncoded || isMultipart) {
                            var charset = 'utf8';
                            var match = /charset=(.+)[;\s]/.exec(contentType);
                            if (!_.isNil(match)) {
                                charset = match[1];
                            }

                            responseObject.text = responseObject.buffer.toString(charset);

                            if (isJson) {
                                responseObject.body = JSON.parse(responseObject.text);
                            } else if (isUrlEncoded) {
                                responseObject.body = qs.parse(responseObject.text);
                            }
                        }
                    });
                } else if (isMultipart) {
                    var form = new IncomingForm();
                    form.parse(responseObject.text, function (err, fields, files) {
                        responseObject.body = fields;
                        responseObject.attachments = files;

                    });
                }

                if (throwOnHttpError && response.statusCode >= 400) {
                    var error = new Error(response.statusMessage);
                    error.requestOptions = requestOptions;
                    error.response = response;
                    return reject(error);
                }

                return resolve(responseObject);
            };


            var formData = null;
            if (!_.isNil(data) || !_.isNil(attachments)) {
                if (requestOptions.headers["Content-Type"] == "multipart/form-data" || !_.isNil(attachments)) {
                    formData = new FormData();

                    _.each(data, function (value, key) {
                        formData.append(key, value);
                    });

                    _.each(attachments, function (value, key) {

                        var filePath, filename = null, readStream;

                        if (_.isString(value)) {
                            filePath = _path.resolve(process.cwd(), value);
                            filename = _path.basename(filePath);
                            readStream = fs.createReadStream(filePath);

                        } else if (_.isPlainObject(value)) {
                            filePath = _.get(value, 'path');

                            if (!_.isNil(filePath)) {
                                filename = _.get(value, 'filename', _path.basename(filePath));
                                readStream = fs.createReadStream(filePath);
                            } else {
                                readStream = _.get(value, 'stream');
                                filename = _.get(value, 'filename');
                            }
                        } else {
                            readStream = value;
                        }

                        formData.append(key, readStream, filename);
                    });

                    requestOptions.headers['Content-Type'] = formData.getHeaders()['content-type'];

                } else {
                    requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    formData = qs.stringify(data);
                }
            }


            var request;
            if (protocol == 'http:') {
                request = http.request(requestOptions, callback);
            } else if (protocol == 'https:') {
                request = https.request(requestOptions, callback);
            } else {
                return reject(new Error("Invalid protocol"));
            }

            request.on('error', function (err) {
                reject(err);
            });

            if (!_.isNil(inputStream)) {
                if (_.isString(inputStream)) {
                    inputStream = fs.createReadStream(_path.resolve(process.cwd(), inputStream));
                }

                inputStream.pipe(request);
            } else if (!_.isNil(formData)) {
                if (formData instanceof FormData) {
                    formData.pipe(request);
                } else {
                    request.write(formData);
                }
            }

            request.end();

        } catch (err) {
            reject(err);
        }

    });
};


module.exports = HttpUtil;