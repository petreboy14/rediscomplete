rediscomplete
=============

A fully CRUD redis autocomplete engine inspired from the antirez and patshaughnessy blogs.

[![Build Status](https://travis-ci.org/petreboy14/rediscomplete.png?branch=master)](https://travis-ci.org/petreboy14/rediscomplete)

[![NPM](https://nodei.co/npm/rediscomplete.png?downloads=true)](https://nodei.co/npm/rediscomplete/)

## Features

* Bootstrap an index of existing data if desired or buld index as you go.
* Index additional data as you go.
* Updates to data will be reflected in index searches.
* Autocomplete single or multi-words in left to right strategy very quickly.
* Removal of item cleans up index.
* Customizable id/search/sort fields and auto-generation of unique id if one doesn't exist.
* Customizable namespacing so as to not interfere with your existing redis entries.
* Automatic alphabetical or custom sorting by sort field.
* 100% code coverage

## Installation

Install **rediscomplete** and have it saved to your _package.json_ dependencies:
```
npm install rediscomplete --save
```

## Usage

Instantiate the RedisComplete library
```
var RedisComplete = require('rediscomplete');
var completer = new RedisComplete({ app: 'music' });

// Data to be indexed
var data = [
  { id: 1, name: 'Metallica' },
  { id: 2, name: 'Van Halen' },
  { id: 3, name: 'Tupac' },
  { id: 4, name: 'Eminem' },
  { id: 5, name: 'Ne-Yo' },
  { id: 6, name: 'New Found Glory' },
  { id: 7, name: 'Alejandro Fernández' }
];

// Index data
completer.index({ data: data }, function (err) {

  // Search for multi-results
  completer.search({ search: 'ne' }, function (err, results) { 
    // Returns: 
    // [{ id: 6, name: 'New Found Glory' }, { id: 5, name: 'Ne-Yo }]
  }); 
  
  // Search second word
  completer.search({ search: 'hale' }, function (err, results) { 
    // Returns: 
    // [{ id: 2, name: 'Van Halen' }]
  });
  
  // Multi-word search
  completer.search({ search: 'van ha' }, function (err, results) { 
    // Returns: 
    // [{ id: 2, name: 'Van Halen' }]
  });
  
  // Inner word search
  completer.search({ search: 'ew' }, function (err, results) {
    // Returns:
    // [{ id: 6, name: 'New Found Glory' }]
  });
  
  // Special character in search
  completer.search({ search: 'Ferná' }, function (err, results) {
    // Returns: 
    // [{ id: 2, name: 'Alejandro Fernández' }]
  });
  
  // Add a new item to the index
  completer.add({ data: { id: 8, name: 'Bob Marley' } }, function (err) {
    completer.search({ search: 'bob' }, function (err, results) {
      // Returns: 
      // [{ id: 8, name: 'Bob Marley' }]
    });
  });
  
  // Update an item in index
  completer.update({ data: { id: 2, name: 'Van-Halen', genre: 'Rock' } }, function (err) {
    completer.search({ search: 'van' }, function (err, results) {
      // Returns: 
      // [{ id: 2, name: 'Van-Halen', genre: 'Rock' }]
    });
  });
  
  // Remove an item from index
  completer.remove({ id: 2 }, function (err) {
    completer.search({ search: 'van' }, function (err, results) {
      // Returns: 
      // []
    });
  });
});
```

# API

## new RedisComplete(options)

Instantiate the RedisComplete class with the following options:
* `host`: Hostname of redis instance. Defaults to `localhost`.
* `port`: Port address of redis instance. Defaults to `6379`.
* `app`: Application namespace for autocomplete index. Will be the first part of key for all index data. Defaults to `autocomplete`.
* auth: Used to pass authentication data to the redis client. Defaults to `null`.

## completer.index(options, cb)

Builds a index out of an array of data for autocompletion. After finishing will call passed in callback function. Options include:
* `data`: The data to be indexes. Must be an array of objects and is required. No default.
* `complKey`: The field which will be used to construct the autocomplete index. If this key is not present in one of the objects then that object will be skipped upon index generation. Defaults to `name`.
* `idField`: The field that will represent the unique id for each item in index. This field must be unique and if it is not present a guid will be constructed for that item. Defaults to `id`.
* `sortField`: This field will choose which field in object will be used to pre-sort results. Default is `name`.
* `ns`: Used for namespacing multiple indexes in one application. For example if two separate artist name and movie name indexes are desired `ns` could be set to `artist` for one index and `movie` for the other index. Defaults to `items`. 

## completer.search(options, cb)

Searches the index for a given term. All searches are left to right based and inner word searches are supported. If the desired item is Bob Marley then searches for `bo`, `bob`, `bob m`, `mar`, `ob`, `arl` will produce the desired results. Searches for `bb` or `mr` will not. Options include:
* `search`: The search to be ran. Must be a string of length greater than 0. 
* `ns`: The namespace of index to search. Defaults to `items`. 
* `limit`: How many results to return. Defaults to `20`.
* `offset`: Used for paging results. Defaults to `0`.

## completer.add(options, cb)

Adds one or more items to the desired term. If an item with the same id is already present it will overwrite that item. Options include:

* `data`: The item or items to add. Either an array or object can be present.
* `complKey`: The field which will be used to construct the autocomplete index. If this key is not present in one of the objects then that object will be skipped upon index generation. Defaults to `name`.
* `idField`: The field that will represent the unique id for each item in index. This field must be unique and if it is not present a guid will be constructed for that item. Defaults to `id`.
* `sortField`: This field will choose which field in object will be used to pre-sort results. Default is `name`.
* `ns`: Used for namespacing multiple indexes in one application. For example if two separate artist name and movie name indexes are desired `ns` could be set to `artist` for one index and `movie` for the other index. Defaults to `items`.

## completer.update(options, cb)

Updates a document in the autocomplete index. If the complKey has changed in the object the item will be reindexed. Otherwise its' cooresponding document will just be updated. If the item doesn't exist in the index it will be added. Options include:

* `data`: The item to be updated. Can either be a single object or array of objects. 
* `complKey`: The field which will be used to construct the autocomplete index. If this key is not present in one of the objects then that object will be skipped upon index generation. Defaults to `name`.
* `idField`: The field that will represent the unique id for each item in index. This field must be unique and if it is not present a guid will be constructed for that item. Defaults to `id`.
* `sortField`: This field will choose which field in object will be used to pre-sort results. Default is `name`.
* `ns`: Used for namespacing multiple indexes in one application. For example if two separate artist name and movie name indexes are desired `ns` could be set to `artist` for one index and `movie` for the other index. Defaults to `items`.
 
## completer.remove(options, cb)

Removes an item and its' references from the index. Options include:

* `id`: The id of the object to be removed. Can also be an array of ids for multiple deletions. 
* `ns`: Used for namespacing multiple indexes in one application. For example if two separate artist name and movie name indexes are desired `ns` could be set to `artist` for one index and `movie` for the other index. Defaults to `items`.

## Resources

* [Auto Complete with Redis](http://oldblog.antirez.com/post/autocomplete-with-redis.html) - Antirez
* [Two ways of using Redisto build a NoSQL search index](http://patshaughnessy.net/2011/11/29/two-ways-of-using-redis-to-build-a-nosql-autocomplete-search-index) - Pat Shaughnessy

## TODO
* Storage and speed measurements
