'use strict';

var Lab = require('lab');
var should = require('should');
var Connection = require('../lib/connection');
var redis = require('redis');


var describe = Lab.experiment;
var it = Lab.test;
var before = Lab.before;
var after = Lab.after;

var conn = null;
var redisConn = redis.createClient();

describe('Connection Tests', function () {

  after(function (done) {
    redisConn.del('foo');
    redisConn.del('foo-hash');
    redisConn.del('foo-hash-all');
    redisConn.del('foo-set');
    redisConn.del('boom');
    redisConn.del('myset');
    redisConn.del('test-sorted-set');
    redisConn.del('foo-set-single');
    done();
  });
  
  it('should have a Connection class', function (done) {
    should.exist(Connection);
    done();
  });
  
  it('should be able to create an instance of Connection', function (done) {
    conn = new Connection();
    should.exist(conn);
    done();
  });
  
  it('should be able to set a string value', function (done) {
    conn.set({key: 'foo', value: 'bar'}, function (err) {
      if (err) {
        throw err;
      } else {
        redisConn.get('foo', function (err, res) {
          if (err) {
            throw err;
          } else {
            res.should.equal('bar');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to set an object value', function (done) {
    conn.set({key: 'foo', value: { foo: 'bar' }}, function (err) {
      if (err) {
        throw err;
      } else {
        redisConn.get('foo', function (err, res) {
          if (err) {
            throw err;
          } else {
            res = JSON.parse(res);
            res.should.have.keys('foo');
            res.foo.should.equal('bar');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to set a key with expiration', function (done) {
    conn.setWithExpiration({key: 'foo', value: 'bar', expiration: 500}, function (err) {
      if (err) {
        throw err;
      } else {
        redisConn.get('foo', function (err, res) {
          if (err) {
            throw err;
          } else {
            res.should.equal('bar');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to reset an items expiration', function (done) {
    redisConn.setex('foo', 5, 'bar', function (err) {
      if (err) {
        throw err;
      } else {
        conn.resetExpiration({key: 'foo', expiration: 2500}, function (err) {
          if (err) {
            throw err;
          } else {
            redisConn.get('foo', function (err, item) {
              if (err) {
                throw err;
              } else {
                item.should.equal('bar');
                done();
              }
            });
          }
        });
      }
    });
  });
  
  it('should be able to delete a field from a hash', function (done) {
    redisConn.hmset('foo-hash', 'bar', 'baz', 'tom', 'bob', function (err) {
      if (err) {
        throw err;
      } else {
        conn.hdel({key: 'foo-hash', field: 'bar'}, function (err) {
          if (err) {
            throw err;
          } else {
            redisConn.hgetall('foo-hash', function (err, res) {
              if (err) {
                throw err;
              } else {
                res.should.not.have.keys('bar');
                done();
              }
            });
          }
        });
      }
    });
  });
  
  it('should be able to set a field on a hash', function (done) {
    redisConn.hmset('foo-hash', 'bar', 'baz', 'tom', 'bob', function (err) {
      if (err) {
        throw err;
      } else {
        conn.hset({key: 'foo-hash', field: 'bob', value: 'is super'}, function (err) {
          if (err) {
            throw err;
          } else {
            redisConn.hgetall('foo-hash', function (err, set) {
              if (err) {
                throw err;
              } else {
                should.exist(set);
                should.exist(set.bob);
                set.bob.should.equal('is super');
                done();
              }
            });
          }
        });
      }
    });
  });
  
  it('should be able to get a field from a hash', function (done) {
    redisConn.hmset('foo-hash', 'bar', 'baz', 'tom', 'bob', function (err) {
      if (err) {
        throw err;
      } else {
        conn.hget({key: 'foo-hash', field: 'bar'}, function (err, value) {
          if (err) {
            throw err;
          } else {
            should.exist(value);
            value.should.equal('baz');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to get some fields from a hash', function (done) {
    redisConn.hmset('foo-hash', ['bar', 'baz', 'tom', 'bob', 'bork', 'boom'], function (err) {
      if (err) {
        throw err;
      } else {
        conn.hmget({key: 'foo-hash', fields: ['bar', 'tom']}, function (err, obj) {
          if (err) {
            throw err;
          } else {
            should.exist(obj);
            obj.should.be.an.instanceOf(Array);
            obj.length.should.equal(2);
            var bazFound = false;
            var bobFound = false;
            obj.forEach(function (item) {
              if (item === 'baz') {
                bazFound = true;
              }
              if (item === 'bob') {
                bobFound = true;
              }
            });
            bazFound.should.equal(true);
            bobFound.should.equal(true);
            done();
          }
        });
      }
    });
  });
  
  it('should be able to get all fields from a hash', function (done) {
    redisConn.hmset('foo-hash-all', 'bar', 'baz', 'tom', 'bob', function (err) {
      if (err) {
        throw err;
      } else {
        conn.hgetall({key: 'foo-hash-all'}, function (err, obj) {
          if (err) {
            throw err;
          } else {
            should.exist(obj);
            obj.should.have.keys('bar', 'tom');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to add an item to a set', function (done) {
    conn.sadd({key: 'foo-set-single', value: 'bob'}, function (err) {
      if (err) {
        throw err;
      } else {
        redisConn.smembers('foo-set-single', function (err, items) {
          if (err) {
            throw err;
          } else {
            items.should.be.an.instanceOf(Array);
            items.length.should.equal(1);
            items[0].should.equal('bob');
            done();
          }
        });
      }
    });
  });
  
  it('should be able to add an element to a set with a score', function (done) {
    conn.zadd({key: 'foo-set', score: 1, value: 'bar'}, function (err) {
      if (err) {
        throw err;
      } else {
        redisConn.zrange('foo-set', 0, 25, function (err, items) {
          if (err) {
            throw err;
          } else {
            var found = false;
            items.forEach(function (item) {
              if (item === 'bar') {
                found = true;
              }
            });
            found.should.equal(true);
            done();
          }
        });
      }
    });
  });
  
  it('should be able to get a range of items in a set by score with no limit/offset', function (done) {
    redisConn.zadd('test-sorted-set', 1, 'one');
    redisConn.zadd('test-sorted-set', 2, 'two');
    redisConn.zadd('test-sorted-set', 3, 'three');
    
    conn.zrangebyscore({key: 'test-sorted-set', min: 1, max: 2}, function (err, items) {
      if (err) {
        throw err;
      } else {
        items.length.should.equal(2);
        items.forEach(function (item) {
          if (item !== 'one' && item !== 'two') {
            throw new Error('Bad item');
          }
        });
        done();
      }
    });
  });
  
  it('should be able to get a range of items in a set by score with with limit/offset', function (done) {
    redisConn.zadd('test-sorted-set', 1, 'one');
    redisConn.zadd('test-sorted-set', 2, 'two');
    redisConn.zadd('test-sorted-set', 3, 'three');
    
    conn.zrangebyscore({key: 'test-sorted-set', min: 1, max: 3, limit: 1}, function (err, items) {
      if (err) {
        throw err;
      } else {
        items.length.should.equal(1);
        items[0].should.equal('one');
        done();
      }
    });
  });
  
  it('should be able to delete a key', function (done) {
    redisConn.set('test-del-key', 'bar', function (err) {
      if (err) {
        throw err;
      } else {
        conn.del('test-del-key', function (err) {
          if (err) {
            throw err;
          } else {
            redisConn.get('test-del-key', function (err, item) {
              if (err) {
                throw err;
              } else {
                should.not.exist(item);
                done();
              }
            });
          }
        });
      }
    });
  });
  
  it('should be able to delete sets of sets', function (done) {
    redisConn.sadd('set-of-sets', 'bar1', function (err) {
      if (err) {
        throw err;
      } else {
        redisConn.sadd('set-of-sets', 'bar2', function (err) {
          if (err) {
            throw err;
          } else {
            redisConn.set('bar1', 'test1', function (err) {
              if (err) {
                throw err;
              } else {
                redisConn.set('bar2', 'test2', function (err) {
                  if (err) {
                    throw err;
                  } else {
                    conn.delSetOfSets('set-of-sets', function (err) {
                      if (err) {
                        throw err;
                      } else {
                        redisConn.get('bar1', function (err, item) {
                          if (err) {
                            throw err;
                          } else {
                            should.not.exist(item);
                            redisConn.get('bar2', function (err, item) {
                              if (err) {
                                throw err;
                              } else {
                                should.not.exist(item);
                                redisConn.get('set-of-sets', function (err, item) {
                                  if (err) {
                                    throw err;
                                  } else {
                                    should.not.exist(item);
                                    done();
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  });
  
  it('should get an error trying to del a non set of sets', function (done) {
    redisConn.set('foo', 'bar', function (err) {
      if (err) {
        throw err;
      } else {
        conn.delSetOfSets('foo', function (err) {
          should.exist(err);
          done();
        });  
      }
    });
  });
  
  it('should be able to get an event on error to redis connection', function (done) {
    conn.once('error', function (err) {
      should.exist(err);
      done();
    });
    conn.conn.emit('error', 'boom');
  });
  
  it('should be able to disconnect', function (done) {
    conn.disconnect();
    setTimeout(function () {
      done();
    }, 1000);
  });
});


