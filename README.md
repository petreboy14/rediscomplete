rediscomplete
=============

A redis autocomplete engine inspired from the antirez and patshaughnessy blogs.

[![Build Status](https://travis-ci.org/petreboy14/rediscomplete.png?branch=master)](https://travis-ci.org/petreboy14/rediscomplete)

## Features

* Bootstrap an index of existing data if desired or buld index as you go.
* Index additional data as you go.
* Updates to data will be reflected in index searches.
* Autocomplete single or multi-words in left to right strategy very quickly.
* Removal of item cleans up index.
* Customizable id/search fields and autogeneration of unique id if one doesn't exist.
* Customizable namespacing so as to not interfere with your existing redis entries.
* Automatic alphabetical sorting by search field. 

## Installation

Install **rediscomplete** and have it saved to your _package.json_ dependencies:
```
npm install rediscomplete --save
```

## Usage

Instantiate the RedisComplete library
```
var RedisComplete = require('rediscomplete');
var completor = new RedisComplete({ app: 'music' });

// Data to be indexed
var data = [
  { id: 1, name: 'Metallica' },
  { id: 2, name: 'Van Halen' },
  { id: 3, name: 'Tupac' },
  { id: 4, name: 'Eminem' },
  { id: 5, name 'Ne-Yo' },
  { id: 6, name: 'New Found Glory' },
  { id: 7, name: 'Alejandro Fernández }
];

// Index data
completor.index({ data: data }, function (err) {

  // Search for multi-results
  completor.search({ search: 'ne' } function (err, results) { 
    // Returns: 
    // [{ id: 6, name: 'New Found Glory' }, { id: 5, name: 'Ne-Yo }]
  }); 
  
  // Search second word
  completor.search({ search: 'hale' } function (err, results) { 
    // Returns: 
    // [{ id: 2, name: 'Van Halen' }]
  });
  
  // Multi-word search
  completor.search({ search: 'van ha' } function (err, results) { 
    // Returns: 
    // [{ id: 2, name: 'Van Halen' }]
  });
  
  // Special character in search
  completor.search({ search: 'Ferná' }, function (err, results) {
    // Returns: 
    // [{ id: 2, name: 'Alejandro Fernández' }]
  });
  
  // Add a new item to the index
  completor.add({ data: { id: 8, name: 'Bob Marley' }, function (err) {
    completor.search({ search: 'bob' }, function (err, results) {
      // Returns: 
      // [{ id: 8, name: 'Bob Marley' }]
    });
  });
  
  // Update an item in index
  completor.update({ data: { id: 2, name: 'Van-Halen', genre: 'Rock' }, function (err) {
    completor.search({ search: 'van' }, function (err, results) {
      // Returns: 
      // [{ id: 2, name: 'Van-Halen', genre: 'Rock' }]
    });
  });
  
  // Remove an item from index
  completor.remove({ id: 2 }, function (err) {
    completor.search({ search: 'van' }, function (err, results) {
      // Returns: 
      // []
    });
  });
});
```

## Resources

* [Auto Complete with Redis](http://oldblog.antirez.com/post/autocomplete-with-redis.html) - Antirez
* [Two ways of using Redisto build a NoSQL search index](http://patshaughnessy.net/2011/11/29/two-ways-of-using-redis-to-build-a-nosql-autocomplete-search-index) - Pat Shaughnessy

## TODO
* Verify removal of intersected sets for multi word searches
* Multi update and delete
* Patch updates instead of full replaces
* Inner word searches (ie. 'om' matching 'Tom' or 'Atom'
* Storage and speed measurements 
