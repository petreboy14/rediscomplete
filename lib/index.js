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
  this.auth = options.auth || null;
  
  this.conn = new Connection({port: this.port, host: this.host, auth: this.auth});
}

RedisComplete.prototype.add = function (options, cb) {
  options.data = (options.data instanceof Array) ? options.data : [options.data];
  this.index(options, cb);
};

RedisComplete.prototype.update = function (options, cb) {
  var self = this;
  var data = (options.data instanceof Array) ? options.data : [options.data];
  var ns = options.ns || 'items';
  var idField = options.idField || 'id';
  var complKey = options.complKey || 'name';
  var sortKey = options.sortKey || 'name';
  
  async.each(data, function (dataItem, cb) {
    self.conn.hget({key: self.app + ':' + ns + ':docs', field: dataItem[idField]}, function (err, item) {
      err && cb(err);
      if (!err) {
        if (!item) {
          self.add({data: [dataItem], ns: ns, idField: idField, complKey: complKey, sortKey: sortKey}, cb);
        } else {
          item = JSON.parse(item);
          var newItem = self.mergeDocs(item, dataItem);
          if (dataItem.hasOwnProperty(complKey) && (item[complKey] !== dataItem[complKey])) {
            self.remove({ ns: ns, id: dataItem[idField]}, function (err) {
              err && cb(err);
              if (!err) {
                self.add({data: newItem, ns: ns, idField: idField, complKey: complKey, sortKey: sortKey}, cb);
              }
            });
          } else {
            self.conn.hset({key: self.app + ':' + ns + ':docs', field: dataItem[idField], value: newItem}, cb);
          }
        }
      }
    });
  }, cb);
};

RedisComplete.prototype.remove = function (options, cb) {
  var self = this;
  var ns = options.ns || 'items';
  var ids = (options.id instanceof Array) ? options.id : [options.id];
  
  async.each(ids, function (id, cb) {
    self.conn.hdel({key: self.app + ':' + ns + ':docs', field: id}, function (err) {
      err && cb(err);
      if (!err) {
        self.conn.smembers({ key: self.app + ':' + ns + ':' + id}, function (err, members) {
          err && cb(err);
          if (!err) {
            async.each(members, function (complKey, cb) {
              self.conn.del(complKey, cb);
            }, cb);
          }
        });
      }
    });
  }, cb);
};

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
    options.sortKey = options.sortKey || 'name';
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
  var sortKey = options.sortKey;
  
  async.each(data, function (item, cb) {
    var id = item[idField];
    var name = item[complKey];
    if (name && name.length > 0) {
      name = self.cleanWord(name);
      var words = name.split(/\s+/);
      var sortName = item.hasOwnProperty(sortKey) ? item[sortKey].toString() : item[complKey].toString();
      var sortNames = sortName.split(/\s+/);
      sortName = sortNames.join('|');
      
      words.forEach(function (word, i) {
        words[i] = { word: word, score: (i + 1) };
      });
      
      async.each(words, function (wordObj, cb) {
        var word = wordObj.word;
        var score = wordObj.score;
        var prefixes = [];
        for (var i = 1; i <= word.length; i++) {
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

RedisComplete.prototype.mergeDocs = function (oldDoc, newDoc) {
  var finalDoc = {};
  for (var newItem in newDoc) {
    if (newDoc.hasOwnProperty(newItem)) {
      finalDoc[newItem] = newDoc[newItem];
    }
  }
  
  for (var oldItem in oldDoc) {
    if (oldDoc.hasOwnProperty(oldItem) && !finalDoc.hasOwnProperty(oldItem)) {
      finalDoc[oldItem] = oldDoc[oldItem];
    }
  }
  
  return finalDoc;
};

RedisComplete.prototype.cleanWord = function (word) {
  word = word.toLowerCase().trim();
  return accentFold(word);
};

module.exports = RedisComplete;