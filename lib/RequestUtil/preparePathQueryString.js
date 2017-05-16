const _ = require('lodash');
const qs = require('qs');

/**
 *
 * @return {{}}
 */
function mergeQueryObjects() {
    var query = {};
    _.each(arguments, function (queryObject) {
        if (!_.isEmpty(queryObject)) {

            if (_.isString(queryObject)) {
                queryObject = qs.parse(queryObject);
            }

            _.assign(query, queryObject);
        }
    });

    return query;
}


/**
 *
 * @param {String} path
 * @param {Object} query
 * @return {String}
 */
function preparePathQueryString(path, query) {
    var delimiterIndex = path.indexOf('?');

    var queryObjects = Array.prototype.slice.call(arguments, 1);

    if (delimiterIndex !== -1) {
        if (delimiterIndex < (path.length - 1)) {
            var existingQueryString = path.substring(delimiterIndex + 1);
            if (!_.isEmpty(existingQueryString)) {
                queryObjects.unshift(existingQueryString);
            }
        }
        path = path.substring(0, delimiterIndex);
    }

    var mergedQuery = mergeQueryObjects.apply(null, queryObjects);

    if (_.isPlainObject(mergedQuery)) {
        mergedQuery = qs.stringify(mergedQuery);
    }

    path += '?' + mergedQuery;

    return path;
}

module.exports = preparePathQueryString;