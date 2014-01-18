'use strict';

var async = require('async');
var uuid = require('node-uuid');

var Connection = require('./connection');
var accentFold = require('./accentFold').accentFold;


function RedisComplete(options) {
  options = options || {};
  this.port = options.port || 6379;
  this.host = options.host || 'localhost';
  this.app = options.app || 'autocomplete';
  
  this.conn = new Connection({port: this.port, host: this.host});
}

RedisComplete.prototype.search = function (options, cb) {
  var self = this;
  var search = this.cleanWord(options.search);
  var limit = options.limit || 20;
  var offset = (options.offset * limit) || 0;
  var terms = search.split(/\s+/);
  var ns = options.ns || 'items';
  if (terms.length > 1) {
    
  } else {
    this.getIdMatches({search: search, ns: ns}, function (err, ids) {
      if (err) {
        cb(err);
      } else {
        self.getDocs({ids: ids, limit: limit, offset: offset, ns: ns}, cb);
      }
    });
  }
};

RedisComplete.prototype.getIdMatches = function (options, cb) {
  var search = options.search;
  var ns = options.ns;
  var key = this.app + ':' + ns + ':compl:' + search;
  this.conn.zrangebyscore({key: key}, cb);
};

RedisComplete.prototype.getDocs = function (options, cb) {
  var ids = options.ids;
  var ns = options.ns;
  var key = this.app + ':' + ns + ':docs';

  if (!ids || ids.length === 0) {
    cb(null, []);
  } else {
    ids.forEach(function (id, i) {
      var idParts = id.split(':');
      ids[i] = idParts[idParts.length - 1];
    });
    this.conn.hmget({key: key, fields: ids}, function (err, docs) {
      if (err) {
        cb(err);
      } else {
        docs.forEach(function (doc, i) {
          docs[i] = JSON.parse(doc);
        });
        cb(null, docs);
      }
    });
  }
};

RedisComplete.prototype.index = function (options, cb) {
  var self = this;
  if (!options.hasOwnProperty('data') || (!(options.data instanceof Array))) {
    cb(new Error('Data element required for indexing'));
  } else {
    options.complKey = options.complKey || 'name';
    options.idField = options.idField || 'id';
    options.ns = options.ns || 'items';
    if (options.refresh) {
      // Clear out old index
    } else {
      this.addDocuments({data: options.data, ns: options.ns, idField: options.idField}, function (err) {
        (err && cb(err)) || self.addCompletions(options, cb);
      });
    }
  }
};

RedisComplete.prototype.addDocuments = function (options, cb) {
  var self = this;
  var data = options.data;
  var ns = this.app + ':' + options.ns  + ':' + 'docs';
  var idField = options.idField;
  async.each(data, function (item, cb) {
    var id = null;
    if (item.hasOwnProperty(idField)) {
      id = item[idField];
    } else {
      id = uuid.v4();
      item[idField] = id;
    }
    self.conn.hset({key: ns, field: id, value: item}, cb);
  }, function (err) {
    cb(err);
  });
};

RedisComplete.prototype.addCompletions = function (options, cb) {
  var self = this;
  var data = options.data;
  var ns = this.app + ':' + options.ns + ':' + 'compl:';
  var complKey = options.complKey;
  var idField = options.idField;
  
  async.each(data, function (item, cb) {
    var id = item[idField];
    var name = item[complKey];
    if (name) {
      name = self.cleanWord(name);
      var words = name.split(/\s+/);
      var sortName = words.join('|');
      
      words.forEach(function (word, i) {
        words[i] = { word: word, score: (i + 1) };
      });
      
      async.forEach(words, function (wordObj, cb) {
        var word = wordObj.word;
        var score = wordObj.score;
        var prefixes = [];
        for (var i = 0; i < word.length; i++) {
          var prefix = word.slice(0, i);
          prefixes.push(ns + prefix);
        }
        async.forEach(prefixes, function (prefix, cb) {
          self.conn.zadd({key: prefix, score: score, value: sortName + ':' + id}, cb);
        }, function (err) {
          if (err) {
            cb(err);
          } else {
            self.conn.zadd({key: ns + word, score: score, value: sortName + ':' + id}, cb);
          }
        });
      });
      cb();
    } 
  }, function (err) {
    cb(err);
  });
};

RedisComplete.prototype.cleanWord = function (word) {
  word = word.toLowerCase().trim();
  return accentFold(word);
};

module.exports = RedisComplete;