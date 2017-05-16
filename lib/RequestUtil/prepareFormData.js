const qs = require('qs');
const fs = require('fs');
const _path = require('path');
const _ = require('lodash');
const FormData = require('form-data');
const mime = require('mime');

const multipartFormDataType = 'multipart/form-data';
const urlEncodedFormDataType = 'application/x-www-form-urlencoded';
const jsonFormDataType = 'application/json';

/**
 *
 * @param {Object} options
 * @param {String} options.contentType
 * @param {Object} options.data
 * @param {Object[]} options.attachments
 * @return {*}
 */
var prepareFormData = function (options) {

    var contentType = _.get(options, 'contentType');
    var data = _.get(options, 'data');
    var attachments = _.get(options, 'attachments');

    if (_.isNil(contentType)) {
        if (!_.isNil(attachments)) {
            contentType = multipartFormDataType;
        } else {
            contentType = urlEncodedFormDataType;
        }
    }

    var formData;
    var contentLength;
    if (contentType.startsWith(jsonFormDataType)) {
        formData = new Buffer(JSON.stringify(data));
        contentLength = formData.length;
        return {inputStream: formData, headers: {'Content-Type': contentType, 'Content-Length': contentLength}};
    } else if (contentType.startsWith(multipartFormDataType)) {

        formData = new FormData();

        _.each(data, function (value, key) {
            formData.append(key, value);
        });

        _.each(attachments, function (value, key) {
            var attachmentPath = null;
            var attachmentOptions = {};
            var attachmentStream = null;
            if (_.isPlainObject(value)) {
                attachmentPath = _.get(value, 'path');
                attachmentStream = _.get(value, 'stream');

                attachmentOptions.filename = _.get(value, 'filename');
                attachmentOptions.contentType = _.get(value, 'contentType');
                attachmentOptions.knownLength = _.get(value, 'knownLength');

            } else {
                if (_.isString(value)) {
                    attachmentPath = value;
                } else {
                    attachmentStream = value;
                }
            }

            if (_.isString(attachmentPath)) {
                attachmentPath = _path.resolve(process.cwd(), attachmentPath);
                attachmentStream = fs.createReadStream(attachmentPath);
                if (_.isUndefined(attachmentOptions.filename)) {
                    attachmentOptions.filename = _path.basename(attachmentPath)
                }
                if (_.isUndefined(attachmentOptions.contentType)) {
                    attachmentOptions.contentType = mime.lookup(attachmentPath)
                }
                if (_.isUndefined(attachmentOptions.knownLength)) {
                    attachmentOptions.knownLength = fs.statSync(attachmentPath).size
                }
            }

            formData.append(key, attachmentStream, attachmentOptions);
        });


        var headers = {'Content-Type': _.get(formData.getHeaders(), 'content-type')};

        if (formData.hasKnownLength()) {
            _.set(headers, 'Content-Length', formData.getLengthSync());
        }

        return {inputStream: formData, headers: headers};
    } else if (contentType.startsWith(urlEncodedFormDataType)) {
        formData = new Buffer(qs.stringify(data));
        contentLength = formData.length;

        return {inputStream: formData, headers: {'Content-Type': contentType, 'Content-Length': contentLength}};
    } else {
        throw new Error("Invalid parameter: contentType")
    }


};

module.exports = prepareFormData;