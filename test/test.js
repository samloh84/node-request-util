const mocha = require('mocha');
const describe = mocha.describe;
const before = mocha.before;
const it = mocha.it;
const chai = require('chai');
const expect = chai.expect;
const RequestUtil = require('../lib/RequestUtil');
const _ = require('lodash');
const CommonUtils = require('@lohsy84/common-utils');
const FileUtil = CommonUtils.FileUtil;


describe('RequestUtil', function () {
    this.timeout(120000); // Timeout in 2 minutes

    describe('should be able to send GET requests', function () {
        it('for a single URL', function () {
            return RequestUtil.request({url: 'http://httpbin.org/get'})
                .then(function (response) {
                    //console.log(response.status);
                    expect(response.status).to.equal(200);
                });
        });


        it('for multiple URLs', function () {
            var urls = ['http://httpbin.org/get?url=1', 'http://httpbin.org/get?url=2', 'http://httpbin.org/get?url=3'];
            return RequestUtil.request({url: urls})
                .then(function (responses) {
                    //console.log(response.status);

                    expect(responses.length).to.equal(3);
                    expect(_.every(responses, function (response, index) {
                        return response.status == 200 && response.body.args.url == index + 1;
                    })).to.equal(true);
                });
        });
    });


    describe('should be able to send POST requests', function () {
        it('for a single URL', function () {
            return RequestUtil.request({url: 'http://httpbin.org/post', method: 'post'})
                .then(function (response) {
                    //console.log(response.status);
                    expect(response.status).to.equal(200);
                });
        });

        it('with form data', function () {
            return RequestUtil.request({url: 'http://httpbin.org/post', method: 'post', data: {data: 1}})
                .then(function (response) {
                    expect(response.status).to.equal(200);
                    expect(response.body.data.data).to.equal(1);
                });
        });
    });


    describe('should be able to download file', function () {
        it('for a single URL', function () {
            return RequestUtil.request({url: 'http://httpbin.org/image/jpeg', savePath: 'downloads/jpeg.jpg', method: 'get'})
                .then(function (response) {
                    //console.log(response.status);
                    return FileUtil.stat({path: 'downloads/jpeg.jpg'})
                        .then(function (stats) {
                            expect(stats).not.to.be.undefined;
                            expect(stats.size).to.equal(35588);
                        });
                });
        });

        it('for a single URL', function () {
            return RequestUtil.request({url: 'http://httpbin.org/image/jpeg', savePath: 'downloads/', method: 'get'})
                .then(function (response) {
                    //console.log(response.status);
                    return FileUtil.stat({path: 'downloads/jpeg'})
                        .then(function (stats) {
                            expect(stats).not.to.be.undefined;
                            expect(stats.size).to.equal(35588);
                        });
                });
        });
    });


});