const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const util = require('util');
const RequestUtil = require('../lib');


chai.use(chaiAsPromised);

chai.should();

chai.config.includeStack = true;


describe("RequestUtil", function () {

    it("should be able to perform a HTTP GET on https://httpbin.org/get", function () {

        return RequestUtil.request({url: "https://httpbin.org/get"})
            .then(function (res) {
                res.statusCode.should.equal(200);
                console.log(util.inspect(res, {depth: null}));
            });
    });

    it("should be able to perform a HTTP GET on https://httpbin.org/get with query data", function () {
        return RequestUtil.request({url: "https://httpbin.org/get", query: {a: 'abc', b: 'def'}})
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.args.should.have.property('a');
                res.body.args.should.have.property('b');
                res.body.args.a.should.equal('abc');
                res.body.args.b.should.equal('def');

                console.log(util.inspect(res, {depth: null}));
            });
    });

    it("should be able to perform a HTTP GET on https://httpbin.org/get with additional query data", function () {

        return RequestUtil.request({url: "https://httpbin.org/get?a=abc&b=def", query: {c: 'ghi', d: 'jkl'}})
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.args.should.have.property('a');
                res.body.args.should.have.property('b');
                res.body.args.should.have.property('c');
                res.body.args.should.have.property('d');
                res.body.args.a.should.equal('abc');
                res.body.args.b.should.equal('def');
                res.body.args.c.should.equal('ghi');
                res.body.args.d.should.equal('jkl');

                console.log(util.inspect(res, {depth: null}));
            });
    });


    it("should be able to perform a HTTP POST on https://httpbin.org/post with JSON payload", function () {

        return RequestUtil.request({
            url: "https://httpbin.org/post",
            method: 'post',
            headers: {'Content-Type': 'application/json'},
            data: {a: 'abc', b: 'def'}
        })
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.json.should.have.property('a');
                res.body.json.should.have.property('b');
                res.body.json.a.should.equal('abc');
                res.body.json.b.should.equal('def');

                console.log(util.inspect(res, {depth: null}));
            });
    });


    it("should be able to perform a HTTP POST on https://httpbin.org/post with url-encoded payload", function () {

        return RequestUtil.request({
            url: "https://httpbin.org/post",
            method: 'post',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: {a: 'abc', b: 'def'}
        })
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.form.should.have.property('a');
                res.body.form.should.have.property('b');
                res.body.form.a.should.equal('abc');
                res.body.form.b.should.equal('def');

                console.log(util.inspect(res, {depth: null}));
            });
    });

    it("should be able to perform a HTTP POST on https://httpbin.org/post with multipart payload", function () {

        return RequestUtil.request({
            url: "https://httpbin.org/post",
            method: 'post',
            headers: {'Content-Type': 'multipart/form-data'},
            data: {a: 'abc', b: 'def'}
        })
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.form.should.have.property('a');
                res.body.form.should.have.property('b');
                res.body.form.a.should.equal('abc');
                res.body.form.b.should.equal('def');

                console.log(util.inspect(res, {depth: null}));
            });
    });


    it("should be able to perform a HTTP POST on https://httpbin.org/post with multipart data and file attachment", function () {

        return RequestUtil.request({
            url: "https://httpbin.org/post",
            method: 'post',
            headers: {'Content-Type': 'multipart/form-data'},
            data: {a: 'abc', b: 'def'},
            attachments: {
                xyz: {stream: new Buffer("abcdef", 'utf8'), filename: 'abc.txt'}
            }
        })
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.body.form.should.have.property('a');
                res.body.form.should.have.property('b');
                res.body.form.a.should.equal('abc');
                res.body.form.b.should.equal('def');
                res.body.files.should.have.property('xyz');
                res.body.files.xyz.should.equal('abcdef');

                console.log(util.inspect(res, {depth: null}));
            });
    });


    it("should be able to follow redirects", function () {
        this.timeout(10000);
        return RequestUtil.request({
            url: "https://httpbin.org/redirect/3",
            method: 'get'
        })
            .then(function (res) {
                res.statusCode.should.equal(200);
                res.should.have.property('redirects');
                res.redirects.length.should.equal(3);

                console.log(util.inspect(res, {depth: null}));
            });
    });

});
