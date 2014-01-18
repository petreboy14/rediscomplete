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
    var prefixes = terms.join('|');
    this.getIdMatches({search: prefixes, ns: ns, limit: limit, offset: 0}, function (err, ids) {
      err && cb(err);
      if (!err) {
        if (!ids || ids.length === 0) {
          self.intersectCompletions({terms: terms, ns: ns, limit: limit}, cb);
        } else {
          self.getDocs({ids: ids, ns: ns}, cb);
        }
      }
    });
  } else {
    this.getIdMatches({search: search, ns: ns, limit: limit, offset: offset}, function (err, ids) {
      (err && cb(err)) || self.getDocs({ids: ids, ns: ns}, cb);
    });
  }
};

RedisComplete.prototype.intersectCompletions = function (options, cb) {
  var self = this;
  var terms = options.terms;
  var ns = options.ns;
  var limit = options.limit;
  var app = this.app;
  
  var intersectionPrefix = this.app + ':' + ns + ':compl:' + terms.join('|');
  terms.forEach(function (term, i) {
    terms[i] = app + ':' + ns + ':compl:' + term; 
  });
  
  this.conn.zinterstore({intersectionKey: intersectionPrefix, keys: terms}, function (err) {
    err && cb(err);
    if (!err) {
      self.conn.zrangebyscore({key: intersectionPrefix, limit: limit, offset: 0}, function (err, ids) {
        err && cb(err);
        if (!err) {
          if (!ids || ids.length === 0) {
            cb(null, []);
          } else {
            self.getDocs({ids: ids, ns: ns}, cb);
          }
        }
      });
    }
  });
};

RedisComplete.prototype.resetIndex = function (options, cb) {
  var self = this;
  var complKey = this.app + ':' + options.ns + ':keys';
  var docsKey = this.app + ':' + options.ns + ':docs';
  this.conn.delSetOfSets(complKey, function (err) {
    err && cb(err);
    if (!err) {
      self.conn.del(docsKey, function (err) {
        err && cb(err);
        if (!err) {
          self.addDocuments({data: options.data, ns: options.ns, idField: options.idField}, function (err) {
            (err && cb(err)) || self.addCompletions(options, cb);
          });
        }
      });
    }
  });
};

RedisComplete.prototype.getIdMatches = function (options, cb) {
  var search = options.search;
  var ns = options.ns;
  var key = this.app + ':' + ns + ':compl:' + search;
  var limit = options.limit;
  var offset = options.offset;

  this.conn.zrangebyscore({key: key, limit: limit, offset: offset}, cb);
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
      err && cb(err);
      if (!err) {
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
    if (options.reset) {
      this.resetIndex(options, cb);
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
    if (name && name.length > 0) {
      name = self.cleanWord(name);
      var words = name.split(/\s+/);
      var sortName = words.join('|');
      
      words.forEach(function (word, i) {
        words[i] = { word: word, score: (i + 1) };
      });
      
      async.each(words, function (wordObj, cb) {
        var word = wordObj.word;
        var score = wordObj.score;
        var prefixes = [];
        for (var i = 0; i < word.length; i++) {
          var prefix = word.slice(0, i);
          prefixes.push(ns + prefix);
        }
        async.each(prefixes, function (prefix, cb) {
          self.conn.sadd({key: self.app + ':' + options.ns + ':keys', value: prefix}, function (err) {
            err && cb(err);
            if (!err) {
              self.conn.sadd({key: self.app + ':' + options.ns + ':' + id, value: prefix}, function (err) {
                err && cb(err);
                if (!err) {
                  self.conn.zadd({key: prefix, score: score, value: sortName + ':' + id}, cb);
                }
              });
            }
          });
        }, function (err) {
          err && cb(err);
          if (!err) {
            self.conn.sadd({key: self.app + ':' + options.ns + ':' + id, value: ns + word}, function (err) {
              err && cb(err);
              if (!err) {
                self.conn.zadd({key: ns + word, score: score, value: sortName + ':' + id}, cb);
              }
            });
          }
        });
      }, function (err) {
        cb(err);
      }); 
    } else {
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