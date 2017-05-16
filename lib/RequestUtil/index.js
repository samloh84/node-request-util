var request = require('./request');

var createRequest = require('./createRequest');
var processResponse = require('./parseResponse');

/**
 * @namespace RequestUtil
 *
 */
var RequestUtil = {};

RequestUtil.request = request;

RequestUtil.createRequest = createRequest;
RequestUtil.processResponse = processResponse;
RequestUtil.pipeResponse = processResponse;


module.exports = RequestUtil;