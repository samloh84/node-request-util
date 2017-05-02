var request = require('./request');

var createRequest = require('./createRequest');
var processResponse = require('./parseResponse');


var RequestUtil = function () {
};

RequestUtil.request = request;

RequestUtil.createRequest = createRequest;
RequestUtil.processResponse = processResponse;
RequestUtil.pipeResponse = processResponse;


module.exports = RequestUtil;