const _ = require('lodash');
const parseContentTypeHeader = require('./parseContentTypeHeader');
const Promise = require('bluebird');

/**
 * @memberOf RequestUtil
 * @function parseResponse
 *
 * @param {*} responseObject
 * @return {Promise<Object>}
 */
var parseResponse = function (responseObject) {
    return new Promise(function (resolve, reject) {
        try {
            var requestOptions = _.get(responseObject, 'requestOptions');
            var response = _.get(responseObject, 'response');
            var redirects = _.get(responseObject, 'redirects');

            var throwHttpError = _.get(responseObject, 'throwHttpError', true);

            response.on('error', function (err) {
                err.response = response;
                err.requestOptions = requestOptions;
                return reject(err);
            });

            var chunks = [];
            response.on('data', function (data) {
                chunks.push(data);
            });

            response.on('end', function () {
                var processedResponseObject = {
                    requestOptions: requestOptions,
                    redirects: redirects,
                    headers: response.headers,
                    rawHeaders: response.rawHeaders,
                    rawTrailers: response.rawTrailers,
                    socket: response.socket,
                    statusCode: response.statusCode,
                    statusMessage: response.statusMessage,
                    trailers: response.trailers,
                    httpVersion: response.httpVersion
                };

                try {
                    processedResponseObject.data = Buffer.concat(chunks);

                    var contentTypeHeader = _.get(response.headers, 'content-type');

                    if (!_.isNil(contentTypeHeader)) {


                        var contentTypeObject = parseContentTypeHeader(contentTypeHeader);
                        processedResponseObject.contentType = contentTypeObject.contentType;
                        processedResponseObject.contentTypeParameters = contentTypeObject.contentTypeParameters;
                        processedResponseObject.contentCharset = contentTypeObject.contentCharset;

                        if (!_.isEmpty(processedResponseObject.contentType)) {
                            var isJson = processedResponseObject.contentType === 'application/json';
                            if (processedResponseObject.contentType.startsWith("text/") || isJson) {
                                processedResponseObject.contentCharset = _.get(processedResponseObject.contentTypeParameters, 'charset', 'utf8');
                                processedResponseObject.text = (new Buffer(processedResponseObject.data, processedResponseObject.contentCharset)).toString();

                                if (isJson) {
                                    processedResponseObject.body = JSON.parse(processedResponseObject.text);
                                }
                            }
                        }
                    }


                    if (throwHttpError) {
                        if (processedResponseObject.statusCode >= 400) {
                            throw new Error("HTTP Error: " + processedResponseObject.statusMessage + "(" + processedResponseObject.statusCode + ")");
                        }
                    }

                    response.destroy();

                    return resolve(processedResponseObject);
                } catch (err) {
                    _.assign(err, processedResponseObject);
                    return reject(err);
                }
            });
        } catch (err) {
            return reject(err);
        }
    });
};

module.exports = parseResponse;

