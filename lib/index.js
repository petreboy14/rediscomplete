'use strict';
var Connection = require('./connection');

function search() {
  
}


function RedisComplete(options) {
  options = options || {};
  this.port = options.port || 6379;
  this.host = options.host || 'localhost';
  this.app = options.app || 'autocomplete';
  
  this.conn = new Connection({port: this.port, host: this.host});
}

RedisComplete.prototype.search = search;

module.exports = RedisComplete;