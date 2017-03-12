const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const util = require('util');
const HttpUtil = require('../lib');


chai.use(chaiAsPromised);

chai.should();

describe("HttpUtil", function () {

    it("should be able to perform a HTTP GET on http://httpbin.org/get", function (done) {

        return HttpUtil.request({url: "https://httpbin.org/get"})
            .should.be.fulfilled
            .then(function (res) {
                res.statusCode.should.equal(200);
                console.log(util.inspect(res, {depth: null}));
            })
            .should.notify(done);
    });

    it("should be able to perform a HTTP GET on http://httpbin.org/get with query data", function (done) {


        return HttpUtil.request({url: "https://httpbin.org/get", query: {a: 'abc', b: 'def'}})
            .should.be.fulfilled
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.args.a.should.equal('abc');
                res.body.args.b.should.equal('def');

                console.log(util.inspect(res, {depth: null}));
            })
            .should.notify(done);
    });

    it("should be able to perform a HTTP GET on http://httpbin.org/get with additional query data", function (done) {

        return HttpUtil.request({url: "https://httpbin.org/get?a=abc&b=def", query: {c: 'ghi', d: 'jkl'}})
            .should.be.fulfilled
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.args.a.should.equal('abc');
                res.body.args.b.should.equal('def');
                res.body.args.c.should.equal('ghi');
                res.body.args.d.should.equal('jkl');

                console.log(util.inspect(res, {depth: null}));
            })
            .should.notify(done);
    });

    it("should be able to perform a HTTP GET on http://httpbin.org/get with url-encoded data", function (done) {

        return HttpUtil.request({
            url: "https://httpbin.org/post",
            method: 'post',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: {a: 'abc', b: 'def'}
        })
            .should.be.fulfilled
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.form.a.should.equal('abc');
                res.body.form.b.should.equal('def');

                console.log(util.inspect(res, {depth: null}));
            })
            .should.notify(done);
    });

    it("should be able to perform a HTTP POST on http://httpbin.org/post with multipart data", function (done) {

        return HttpUtil.request({
            url: "https://httpbin.org/post",
            method: 'post',
            headers: {'Content-Type': 'multipart/form-data'},
            data: {a: 'abc', b: 'def'}
        })
            .should.be.fulfilled
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.form.a.should.equal('abc');
                res.body.form.b.should.equal('def');

                console.log(util.inspect(res, {depth: null}));
            })
            .should.notify(done);
    });


    it("should be able to perform a HTTP POST on http://httpbin.org/post with multipart data and file attachment", function (done) {

        return HttpUtil.request({
            url: "https://httpbin.org/post",
            method: 'post',
            headers: {'Content-Type': 'multipart/form-data'},
            data: {a: 'abc', b: 'def'},
            attachments: {
                xyz: {stream: new Buffer("abcdef", 'utf8'), filename: 'abc.txt'}
            }
        })
            .should.be.fulfilled
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.form.a.should.equal('abc');
                res.body.form.b.should.equal('def');
                res.body.files.xyz.should.equal('abcdef');

                console.log(util.inspect(res, {depth: null}));
            })
            .should.notify(done);
    });


    it("should be able to follow redirects", function (done) {

        return HttpUtil.request({
            url: "http://httpbin.org/redirect/6",
            method: 'get'
        })
            .should.be.fulfilled
            .then(function (res) {
                res.statusCode.should.equal(200);

                console.log(util.inspect(res, {depth: null}));
            })
            .should.notify(done);
    });

});
