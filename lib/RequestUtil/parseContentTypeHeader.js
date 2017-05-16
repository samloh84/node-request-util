const qs = require('qs');
const _ = require('lodash');

/**
 *
 * @param {String} contentTypeHeader
 * @return {{contentType:String, contentTypeParameters:Object,contentCharset:String}}
 */
var parseContentTypeHeader = function (contentTypeHeader) {

    var delimiterIndex = contentTypeHeader.indexOf(';');

    var contentType, contentTypeParameters = null;
    if (delimiterIndex !== -1) {
        contentType = contentTypeHeader.substring(0, delimiterIndex);
        if (delimiterIndex < (contentTypeHeader.length - 1)) {
            contentTypeParameters = contentTypeHeader.substring(delimiterIndex + 1);
            contentTypeParameters = qs.parse(contentTypeParameters, {delimiter: ';'});
        }
    } else {
        contentType = contentTypeHeader;
    }

    var contentCharset = _.get(contentTypeParameters, 'charset', 'utf8');

    return {
        contentType: contentType,
        contentTypeParameters: contentTypeParameters,
        contentCharset: contentCharset
    }
};
module.exports = parseContentTypeHeader;