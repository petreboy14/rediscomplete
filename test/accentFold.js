'use strict';
var accentFold = require('../lib/accentFold').accentFold;

var Lab = require('lab');
var should = require('should');
var describe = Lab.experiment;
var it = Lab.test;

describe('accentFold Tests', function () {
  it('should exist', function (done) {
    should.exist(accentFold);
    accentFold.should.be.an.instanceOf(Function);
    done();
  });
  
  it('should be able return a string the same as a string with no accents', function (done) {
    var string = 'Donuts are awesome';
    var changed = accentFold(string);
    string.should.equal(changed);
    done();
  });
  
  it('should be able to convert accented characters to plain ones', function (done) {
    var string = 'niños';
    var changed = accentFold(string);
    changed.should.equal('ninos');
    done();
  });
  
  it('should return empty string on a null string', function (done) {
    var string = null;
    var changed = accentFold(string);
    changed.should.equal('');
    done();
  });
});