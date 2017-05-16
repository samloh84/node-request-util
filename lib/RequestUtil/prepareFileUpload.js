const qs = require('qs');
const fs = require('fs');
const _path = require('path');
const _ = require('lodash');
const mime = require('mime');

/**
 *
 * @param options
 * @param {String} options.contentType
 * @param {Number} options.contentLength
 * @param {ReadableStream|String} options.inputFile
 * @return {{inputStream: ReadableStream, headers: Object}}
 */
var prepareFileUpload = function (options) {

    var contentType = _.get(options, 'contentType');
    var contentLength = _.get(options, 'contentLength');
    var inputFile = _.get(options, 'inputFile');

    var inputStream;
    if (_.isString(inputFile)) {
        inputFile = _path.resolve(process.cwd(), inputFile);

        if (_.isNil(contentType)) {
            contentType = mime.lookup(inputFile);
        }

        if (_.isNil(contentLength)) {
            contentLength = fs.statSync(inputFile).size;
        }

        inputStream = fs.createReadStream(inputFile);
    } else {
        inputStream = inputFile;
    }


    return {inputStream: inputStream, headers: {'Content-Type': contentType, 'Content-Length': contentLength}};

};

module.exports = prepareFileUpload;