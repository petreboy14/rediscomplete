'use strict';
var redis = require('redis');
var async = require('async');
var events = require('events');
var util = require('util');

function Connection(options) {
  var self = this;
  
  options = options || {};
  var port = options.port || 6379;
  var host = options.host || '127.0.0.1';
  this.conn = redis.createClient(port, host, {
    auth: options.auth
  });

  this.conn.on('ready', function () {
    self.emit('ready');
  });

  this.conn.on('connect', function () {
    self.emit('connect');
  });

  this.conn.on('error', function (err) {
    self.emit('error', err);
  });

  this.conn.on('end', function () {
    self.emit('end');
  });

  this.conn.on('drain', function () {
    self.emit('drain');
  });

  this.conn.on('idle', function () {
    self.emit('idle');
  });
  
  events.EventEmitter.call(this);
}

util.inherits(Connection, events.EventEmitter);

Connection.prototype.set = function (options, cb) {
  var key = options.key;
  var value = (options.value instanceof Object) ? JSON.stringify(options.value) : options.value;

  return this.conn.set(key, value, cb);
};

Connection.prototype.setWithExpiration = function (options, cb) {
  var key = options.key;
  var value = (options.value instanceof Object) ? JSON.stringify(options.value) : options.value;
  var expiration = options.expiration;
  
  return this.conn.setex(key, expiration, value, cb);
};

Connection.prototype.hdel = function (options, cb) {
  var key = options.key;
  var field = options.field;
  
  return this.conn.hdel(key, field, cb);
};

Connection.prototype.hset = function (options, cb) {
  var key = options.key;
  var field = options.field;
  var value = (options.value instanceof Object) ? JSON.stringify(options.value) : options.value;
  
  return this.conn.hset(key, field, value, cb);
};

Connection.prototype.hget = function (options, cb) {
  var key = options.key;
  var field = options.field;
  
  return this.conn.hget(key, field, cb);
};

Connection.prototype.hmget = function (options, cb) {
  var key = options.key;
  var fields = options.fields;
  
  return this.conn.hmget(key, fields, cb);
};

Connection.prototype.hgetall = function (options, cb) {
  var key = options.key;

  return this.conn.hgetall(key, cb);
};

Connection.prototype.zadd = function (options, cb) {
  var key = options.key;
  var score = options.score || 0;
  var value = options.value;
  
  return this.conn.zadd(key, score, value, cb);
};

Connection.prototype.resetExpiration = function (options, cb) {
  var key = options.key;
  var expiration = options.expiration;
  
  return this.conn.expire(key, expiration, cb);
};

Connection.prototype.zrangebyscore = function (options, cb) {
  var key = options.key;
  var min = options.min || 0;
  var max = options.max || Infinity;
  var limit = options.limit;
  var offset = options.offset || 0;
  if (limit) {
    return this.conn.zrangebyscore(key, min, max, 'limit', offset, limit, cb);
  } else {
    return this.conn.zrangebyscore(key, min, max, cb);
  }
};

Connection.prototype.delSetOfSets = function (key, cb) {
  var self = this;
  return this.conn.smembers(key, function (err, members) {
    if (err) {
      cb(err);
    } else {
      async.each(members, function (item, cb) {
        self.conn.del(item, function (err) {
          cb(err);
        });
      }, function (err) {
        (err && cb(err)) || self.conn.del(key, cb);
      });
    }
  });
};

Connection.prototype.del = function (key, cb) {
  return this.conn.del(key, cb);
};

Connection.prototype.disconnect = function () {
  this.conn.quit();
};

module.exports = Connection;