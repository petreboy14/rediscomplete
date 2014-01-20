'use strict';

var Lab = require('lab');
var should = require('should');
var Completer = require('../lib/index');
var redis = require('redis');
var async = require('async');

var describe = Lab.experiment;
var it = Lab.test;
var after = Lab.after;

var completer = null;
var redisConn = redis.createClient();

describe('Completer', function () {
  after(function (done) {
    redisConn.keys('autocomplete*', function (err, keys) {
      if (err) {
        throw err;
      } else {
        async.each(keys, function (key, cb) {
          redisConn.del(key, cb);
        }, function (err) {
          if (err) {
            throw err;
          } else {
            done();
          }
        });
      }
    });
  });
  
  it('should exist and be able to initialize', function (done) {
    should.exist(Completer);
    completer = new Completer();
    should.exist(completer);
    done();
  });
  
  it('should be able to create an index of documents', function (done) {
    var data = [{ id: 1, name: 'Peter Allen' }, { id: 2, name: 'Grant Tom'}, { id: 3, name: 'Peter Chapster' }, { id: 4, name: 'Alejandro Fernández' }];
    completer.index({data: data}, function (err) {
      if (err) {
        throw err;
      } else {
        redisConn.keys('autocomplete:items:compl:*', function (err, data) {
          if (err) {
            throw err;
          } else {
            should.exist(data);
            data.should.be.an.instanceOf(Array);
            data.length.should.not.equal(0);
            redisConn.hgetall('autocomplete:items:docs', function (err, item) {
              if (err) {
                throw err;
              } else {
                should.exist(item);
                item.should.have.keys('1', '2', '3', '4');
                JSON.parse(item['1']).name.should.equal('Peter Allen');
                JSON.parse(item['2']).name.should.equal('Grant Tom');
                JSON.parse(item['3']).name.should.equal('Peter Chapster');
                JSON.parse(item['4']).name.should.equal('Alejandro Fernández');
                done();
              }
            });
          }
        });
      }
    });
  });
  
  it('should be able to autocomplete a simple one word search for one document', function (done) {
    var search = 'gran';
    
    completer.search({ search: search }, function (err, items) {
      if (err) {
        throw err;
      } else {
        should.exist(items);
        items.should.be.an.instanceOf(Array);
        items.length.should.equal(1);
        items[0].should.have.keys('id', 'name');
        items[0].id.should.equal(2);
        items[0].name.should.equal('Grant Tom');
        done();
      }
    });
  });
  
  it('should be able to find a name with an accented character in search', function (done) {
    var search = 'Ferná';
    
    completer.search({ search: search }, function (err, items) {
      if (err) {
        throw err;
      } else {
        should.exist(items);
        items.should.be.an.instanceOf(Array);
        items.length.should.equal(1);
        items[0].should.have.keys('id', 'name');
        items[0].id.should.equal(4);
        items[0].name.should.equal('Alejandro Fernández');
        done();
      }
    });
  });
  
  it('should be able to autocomplete a simple uppercased word search for one document', function (done) {
    var search = 'GRan';
    
    completer.search({ search: search }, function (err, items) {
      if (err) {
        throw err;
      } else {
        should.exist(items);
        items.should.be.an.instanceOf(Array);
        items.length.should.equal(1);
        items[0].should.have.keys('id', 'name');
        items[0].id.should.equal(2);
        items[0].name.should.equal('Grant Tom');
        done();
      }
    });
  });
  
  it('should be able to autocomplete a simple uppercased word from the second word for one document', function (done) {
    var search = 'to';
    
    completer.search({ search: search }, function (err, items) {
      if (err) {
        throw err;
      } else {
        should.exist(items);
        items.should.be.an.instanceOf(Array);
        items.length.should.equal(1);
        items[0].should.have.keys('id', 'name');
        items[0].id.should.equal(2);
        items[0].name.should.equal('Grant Tom');
        done();
      }
    });
  });
  
  it('should be able to autocomplete multiple words', function (done) {
    var search = 'grant to';
    
    completer.search({ search: search }, function (err, items) {
      if (err) {
        throw err;
      } else {
        should.exist(items);
        items.should.be.an.instanceOf(Array);
        items.length.should.equal(1);
        items[0].should.have.keys('id', 'name');
        items[0].id.should.equal(2);
        items[0].name.should.equal('Grant Tom');
        completer.search({ search: search }, function (err, items) {
          if (err) {
            throw err;
          } else {
            should.exist(items);
            items.should.be.an.instanceOf(Array);
            items.length.should.equal(1);
            items[0].should.have.keys('id', 'name');
            items[0].id.should.equal(2);
            items[0].name.should.equal('Grant Tom');
            done();
          }
        });
      }
    });
  });
  
  it('shoudn\'t find results for multiple word searches with no corresponding index values', function (done) {
    var search = 'grant koadsadasd';
    completer.search({ search: search }, function (err, items) {
      if (err) {
        throw err;
      } else {
        should.exist(items);
        items.should.be.an.instanceOf(Array);
        items.length.should.equal(0);
        done();
      }
    });
  });
  
  it('should be able to autocomplete a simple uppercased word search for two documents', function (done) {
    var search = 'pet';
    
    completer.search({ search: search }, function (err, items) {
      if (err) {
        throw err;
      } else {
        should.exist(items);
        items.should.be.an.instanceOf(Array);
        items.length.should.equal(2);
        var name1 = items[0].name;
        var name2 = items[1].name;
        var inOrder = (name1 < name2);
        inOrder.should.equal(true);
        done();
      }
    });
  });
  
  it('should return empty results for no autocomplete found', function (done) {
    var search = 'foobar';
    
    completer.search({ search: search }, function (err, items) {
      if (err) {
        throw err;
      } else {
        should.exist(items);
        items.should.be.an.instanceOf(Array);
        items.length.should.equal(0);
        done();
      }
    });
  });
  
  it('should be able to add data that doesn\'t have an id', function (done) {
    var data = [{ name: 'bob'}, { name: 'carl'}, { name: ''} ];
    completer.index({data: data, ns: 'test' }, function (err) {
      if (err) {
        throw err;
      } else {
        done();
      }
    });
  });
  
  it('should be able to add data and reset the current index', function (done) {
    var data = [{ name: 'bob'}, { name: 'carl'} ];
    completer.index({data: data, ns: 'test', reset: true }, function (err) {
      if (err) {
        throw err;
      } else {
        done();
      }
    });
  });
  
  it('should return an error when no data is given to index', function (done) {
    completer.index({}, function (err) {
      should.exist(err);
      err.should.be.an.instanceOf(Error);
      done();
    });
  });
  
  it('should be able to add a single item to the autocomplete index', function (done) {
    completer.add({ data: {id: 5, name: 'Tony Anderson' }}, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'tony' }, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.should.be.an.instanceOf(Array);
            results.length.should.equal(1);
            results[0].name.should.equal('Tony Anderson');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to add multiple items to the autocomplete index', function (done) {
    completer.add({ data: [{ id: 6, name: 'Bob Miller' }, { id: 7, name: 'Bob Sagat' }]}, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'bob' }, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.should.be.an.instanceOf(Array);
            results.length.should.equal(2);
            results[0].name.should.equal('Bob Miller');
            results[1].name.should.equal('Bob Sagat');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to remove an item from the index', function (done) {
    completer.remove({ id: 2 }, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'gran' }, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.length.should.equal(0);
            done();
          }
        });
      }
    });
  });
  
  it('should be able to update an item in the index', function (done) {
    completer.update({data: { id: 1, name: 'Bob Hope' }}, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'hennin' }, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.length.should.equal(0);
            completer.search({ search: 'hope' }, function (err, results) {
              if (err) {
                throw err;
              } else {
                should.exist(results);
                results.should.be.an.instanceOf(Array);
                results.length.should.equal(1);
                results[0].name.should.equal('Bob Hope');
                done();
              }
            });
          }
        });
      }
    });
  });
  
  it('should create a new item on update to non-existing entry', function (done) {
    completer.update({data: { id: 25, name: 'Lucy Ball'}}, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'Lucy B' }, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.should.be.an.instanceOf(Array);
            results.length.should.equal(1);
            results[0].name.should.equal('Lucy Ball');
            done();
          }
        });
      }
    });
  });
  
  it('should do a simple update for an item that doesn\'t change the complField', function (done) {
    completer.update({data: { id: 1, name: 'Bob Hope', foo: 'bar' }}, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'hope' }, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.should.be.an.instanceOf(Array);
            results.length.should.equal(1);
            results[0].name.should.equal('Bob Hope');
            results[0].foo.should.equal('bar');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to do multiple updates', function (done) {
    completer.update({ data: [ { id: 1, name: 'Bob Jones', foo: 'bar' }, { id: 3, name: 'Peter Parker' }]}, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'jone'}, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.should.be.an.instanceOf(Array);
            results.length.should.equal(1);
            results[0].name.should.equal('Bob Jones');
            completer.search({ search: 'park'}, function (err, results) {
              should.exist(results);
              results.should.be.an.instanceOf(Array);
              results.length.should.equal(1);
              results[0].name.should.equal('Peter Parker');
              done();
            });
          }
        });
      }
    });
  });
  
  it('should be able to remove multiple items', function (done) {
    completer.remove({ id: [1, 3] }, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'jone' }, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.length.should.equal(0);
            completer.search({ search: 'park' }, function (err, results) {
              if (err) {
                throw err;
              } else {
                should.exist(results);
                results.length.should.equal(0);
                done();
              }
            });
          }
        });
      }
    });
  });
  
  it('should be able to make an update which doesn\'t lose pre-existing fields', function (done) {
    completer.add({data: { id: 1, name: 'Bob Hope', foo: 'bar' }}, function (err) {
      if (err) {
        throw err;
      } else {
        completer.update({data: {id: 1, name: 'Bob Hope', baz: 'blah'}}, function (err) {
          if (err) {
            throw err;
          } else {
            completer.search({search: 'hope'}, function (err, results) {
              if (err) {
                throw err;
              } else {
                should.exist(results);
                results.should.be.an.instanceOf(Array);
                results.length.should.equal(1);
                results[0].should.have.keys('id', 'name', 'foo', 'baz');
                done();
              }
            });
          }
        });
      }
    });
  });
  
  it('should be able to sort by different key', function (done) {
    completer.index({ reset: true, data: [{id: 1, name: 'bob smith', priority: 1}, { id: 2, name: 'bob jane', priority: 2}, { id: 3, name: 'bob dillan', priority: 3}], sortKey: 'priority'}, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'bob' }, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.should.be.an.instanceOf(Array);
            results.length.should.equal(3);
            results[0].name.should.equal('bob smith');
            results[1].name.should.equal('bob jane');
            results[2].name.should.equal('bob dillan');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to ignore special characters in creation and searching', function (done) {
    completer.add({data: {id: 4, name: '$$Ne-Yo$$', priority: -1}, sortKey: 'priority'}, function (err) {
      if (err) {
        throw err;
      } else {
        completer.search({ search: 'yo' }, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.should.be.an.instanceOf(Array);
            results.length.should.equal(1);
            results[0].name.should.equal('$$Ne-Yo$$');
            done();
          }
        });
      }
    });
  });
  
  it('should remove all completion intersections when deleting entry', function (done) {
    completer.search({search: 'bob sm'}, function (err, results) {
      if (err) {
        throw err;
      } else {
        should.exist(results);
        results.should.be.an.instanceOf(Array);
        results.length.should.equal(1);
        results[0].name.should.equal('bob smith');
        completer.remove({id: 1}, function (err) {
          if (err) {
            throw err;
          } else {
            redisConn.keys('autocomplete:items:compl:bob|sm*', function (err, results) {
              if (err) {
                throw err;
              } else {
                should.exist(results);
                results.should.be.an.instanceOf(Array);
                results.length.should.equal(0);
                done();
              }
            });
          }
        });
      }
    });
  });
  
  it('should be able to get results for inner word searches', function (done) {
    completer.search({search: 'ob'}, function (err, results) {
      if (err) {
        throw err;
      } else {
        should.exist(results);
        results.should.be.an.instanceOf(Array);
        results.length.should.equal(2);
        results[0].name.should.equal('bob jane');
        results[1].name.should.equal('bob dillan');
        done();
      }
    });
  });
  
  it('should support indexing an array of strings', function (done) {
    var data = ['tom', 'tommy', 'ted', 'bob', 'joe', 'jane', 'oscar'];
    
    completer.index({data: data, reset: true}, function (err) {
      if (err) {
        throw err; 
      } else {
        completer.search({search: 'to'}, function (err, results) {
          if (err) {
            throw err;
          } else {
            should.exist(results);
            results.should.be.an.instanceOf(Array);
            results.length.should.equal(2);
            results[0].name.should.equal('tom');
            results[1].name.should.equal('tommy');
            done();
          }
        });
      }
    });
  });
});