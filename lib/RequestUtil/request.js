const createRequest = require('./createRequest');
const parseResponse = require('./parseResponse');
const pipeResponse = require('./pipeResponse');
const _ = require('lodash');
const _url = require('url');

var request = function (options) {

    var url;
    if (_.isString(arguments[0])) {
        url = arguments[0];
        if (!_.isNil(arguments[1])) {
            options = arguments[1];
        } else {
            options = {};
        }
        options.url = url;
    }

    return createRequest(options)
        .then(function (responseObject) {
            var redirects = _.get(options, 'redirects', true);
            var redirectResponseObjects = [];

            function followRedirects(responseObject) {
                var statusCode = _.get(responseObject, 'response.statusCode');
                var requestOptions = _.get(responseObject, 'requestOptions');

                if (statusCode === 301 || statusCode === 302) {
                    redirectResponseObjects.unshift(responseObject);

                    var redirectUrl = _.get(responseObject, 'response.headers.location');

                    redirectUrl = _url.resolve(_url.format(requestOptions), redirectUrl);

                    if (redirects === true || (_.isNumber(redirects) && (redirects === -1 || redirectResponseObjects.length < redirects))) {
                        return createRequest(redirectUrl, requestOptions)
                            .then(followRedirects);
                    }

                } else {
                    if (!_.isEmpty(redirectResponseObjects)) {
                        _.set(responseObject, 'redirects', redirectResponseObjects);
                    }
                    return responseObject;
                }
            }

            return followRedirects(responseObject);
        })
        .then(function (responseObject) {
            var parse = _.get(options, 'parse', true);
            var outputStream = _.get(options, 'outputStream');

            if (!_.isNil(outputStream)) {
                return pipeResponse(responseObject, outputStream);
            } else if (parse) {
                return parseResponse(responseObject);
            }

            return responseObject;
        });
};

module.exports = request;