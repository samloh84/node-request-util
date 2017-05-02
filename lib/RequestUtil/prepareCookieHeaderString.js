const _ = require('lodash');
const qs = require('qs');

var prepareCookieHeaderString = function (cookies, existingCookies) {
    if (!_.isNil(existingCookies)) {
        if (_.isString(existingCookies)) {
            existingCookies = qs.parse(existingCookies, {delimiter: ';'});
        }
        if (_.isString(cookies)) {
            cookies = qs.parse(cookies, {delimiter: ';'});
        }
        cookies = _.assign({}, existingCookies, cookies);
    }

    if (!_.isString(cookies)) {
        cookies = qs.stringify(cookies, {delimiter: ';'});
    }

    return cookies;
};

module.exports = prepareCookieHeaderString;