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
  { id: 5, name 'Neyo' },
  { id: 6, name: 'New Found Glory' }
];

completor.index({ data: data }, function (err) {
  completor.search({ search: 'ne' } function (err, results) { 
    // Will return New Found Glory and Neyo
  }); 
  completor.search({ search: 'hale' } function (err, results) { 
    // Returns Van Halen 
  }); 
});
```

## TODO
* Verify removal of intersected sets for multi word searches
* Multi update and delete
* Patch updates instead of full replaces
* Inner word searches (ie. 'om' matching 'Tom' or 'Atom'
* Storage and speed measurements 
