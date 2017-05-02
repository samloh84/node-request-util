const fs = require('fs');
const _ = require('lodash');
const Promise = require('bluebird');

var pipeResponse = function (responseObject, outputStream) {
    return new Promise(function (resolve, reject) {
        try {
            var requestOptions = _.get(responseObject, 'requestOptions');
            var response = _.get(responseObject, 'response');
            var redirects = _.get(responseObject, 'redirects');

            if (_.isString(outputStream)) {
                outputStream = fs.open(outputStream, 'w');
            }

            response.on('error', function (err) {
                err.response = response;
                err.requestOptions = requestOptions;
                return reject(err);
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
                    response.destroy();

                    return resolve(processedResponseObject);
                } catch (err) {
                    _.assign(err, processedResponseObject);
                    return reject(err);
                }
            });

            responseObject.response.pipe(outputStream);

        } catch (err) {
            return reject(err);
        }
    });
};

module.exports = pipeResponse;
