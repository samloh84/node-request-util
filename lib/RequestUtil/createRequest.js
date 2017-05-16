const _ = require('lodash');
const _url = require('url');
const http = require('http');
const https = require('https');
const mime = require('mime');
const Promise = require('bluebird');


const prepareCookieHeaderString = require('./prepareCookieHeaderString');
const preparePathQueryString = require('./preparePathQueryString');
const prepareFormData = require('./prepareFormData');
const prepareFileUpload = require('./prepareFileUpload');
const qs = require('qs');

/**
 * @memberOf RequestUtil
 * @function createRequest
 *
 * @param {Object} options
 * @return {Promise<*>}
 */
var createRequest = function (options) {
    var args = Array.prototype.slice.call(arguments, 0);

    return new Promise(function (resolve, reject) {
        try {
            var url;

            if (_.isString(args[0])) {
                url = args [0];
                if (!_.isNil(args [1])) {
                    options = args [1];
                }
            } else {
                url = _.get(options, 'url');
            }


            var protocol, auth, host, port, path, urlQuery;


            if (_.isNil(url)) {
                protocol = _.get(options, 'protocol');
                auth = _.get(options, 'auth');
                host = _.get(options, 'hostname', _.get(options, 'host'));
                port = _.get(options, 'port');
                path = _.get(options, 'path');
                urlQuery = null;
            } else {
                var parsedUrl = _url.parse(url, false, false);
                protocol = _.get(parsedUrl, 'protocol');
                auth = _.get(parsedUrl, 'auth');
                host = _.get(parsedUrl, 'hostname', _.get(parsedUrl, 'host'));
                port = _.get(parsedUrl, 'port');
                path = _.get(parsedUrl, 'path');
                urlQuery = _.get(parsedUrl, 'query');
            }

            var family = _.get(options, 'family');
            var localAddress = _.get(options, 'localAddress');
            var socketPath = _.get(options, 'socketPath');
            var method = _.get(options, 'method');
            var headers = _.get(options, 'headers');
            var agent = _.get(options, 'agent');
            var createConnection = _.get(options, 'createConnection');
            var timeout = _.get(options, 'timeout');

            var inputStream = _.get(options, 'inputStream');

            var cookies = _.get(options, 'cookies');

            var contentType = _.get(options, 'contentType');
            var contentLength = _.get(options, 'contentLength');

            var data = _.get(options, 'data');
            var query = _.get(options, 'query');
            var inputFile = _.get(options, 'inputFile');
            var attachments = _.get(options, 'attachments');


            var requestPath;
            if (!_.isNil(query)) {
                requestPath = preparePathQueryString(path, urlQuery, query);
            } else {
                requestPath = path;
            }

            if (!_.isNil(cookies)) {
                var existingCookies = _.get(headers, 'Cookie');

                cookies = prepareCookieHeaderString(cookies, existingCookies);

                if (_.isNil(headers)) {
                    headers = {};
                }

                _.set(headers, 'Cookie', cookies);
            }

            if (!_.isNil(contentType)) {
                if (contentType.indexOf('/') === -1) {
                    contentType = mime.lookup(contentType);
                }

                if (_.isNil(headers)) {
                    headers = {};
                }

                _.set(headers, 'Content-Type', contentType);
            } else {
                contentType = _.get(headers, 'Content-Type');
            }

            if (!_.isNil(data) || !_.isNil(attachments)) {
                if (!_.isNil(inputStream) || !_.isNil(inputFile)) {
                    throw new Error("Conflicting parameters: inputStream, inputFile, data or attachments");
                }

                var formData = prepareFormData({
                    contentType: contentType,
                    data: data,
                    attachments: attachments
                });

                inputStream = formData.inputStream;
                _.assign(headers, formData.headers);
            }

            if (!_.isNil(inputFile)) {
                var inputFileData = prepareFileUpload({
                    contentType: contentType,
                    contentLength: contentLength,
                    inputFile: inputFile
                });
                inputStream = inputFileData.inputStream;
                _.assign(headers, inputFileData.headers);
            }


            var request;

            var requestOptions = {
                protocol: protocol,
                host: host,
                family: family,
                port: port,
                localAddress: localAddress,
                socketPath: socketPath,
                method: method,
                path: requestPath,
                headers: headers,
                auth: auth,
                agent: agent,
                createConnection: createConnection,
                timeout: timeout
            };

            var callback = function (response) {
                resolve({requestOptions: requestOptions, response: response});
            };

            var errorCallback = function (err) {
                err.requestOptions = requestOptions;
                reject(err);
            };

            var createRequestFunction;

            if (protocol === 'https:') {
                var pfx = _.get(options, 'pfx');
                var key = _.get(options, 'key');
                var passphrase = _.get(options, 'passphrase');
                var cert = _.get(options, 'cert');
                var ca = _.get(options, 'ca');
                var ciphers = _.get(options, 'ciphers');
                var rejectUnauthorized = _.get(options, 'rejectUnauthorized');
                var secureProtocol = _.get(options, 'secureProtocol');
                var servername = _.get(options, 'servername');

                _.assign(requestOptions, {
                    pfx: pfx,
                    key: key,
                    passphrase: passphrase,
                    cert: cert,
                    ca: ca,
                    ciphers: ciphers,
                    rejectUnauthorized: rejectUnauthorized,
                    secureProtocol: secureProtocol,
                    servername: servername
                });

                createRequestFunction = https.request;

            } else {
                createRequestFunction = http.request;
            }

            requestOptions = _.omitBy(requestOptions, _.isUndefined);

            request = createRequestFunction(requestOptions, callback);

            request.on('error', errorCallback);

            if (!_.isNil(inputStream)) {
                if (_.isString(inputStream) || _.isBuffer(inputStream)) {
                    request.write(inputStream);
                    request.end();
                } else {
                    inputStream.on('error', function (err) {
                        reject(err);
                    });

                    inputStream.on('end', function () {
                        request.end();
                    });

                    inputStream.pipe(request);
                }
            } else {
                request.end();
            }


        } catch (err) {
            return reject(err);
        }
    });
};


module.exports = createRequest;
