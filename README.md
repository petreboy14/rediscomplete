rediscomplete
=============

A redis autocomplete engine inspired from the antirez and patshaughnessy blogs.

[![Build Status](https://travis-ci.org/petreboy14/rediscomplete.png?branch=master)](https://travis-ci.org/petreboy14/rediscomplete)

## Features

* Bootstrap an index of existing data if desired or buld index as you go
* Index additional data as you go
* Updates to data will be reflected in index searches
* Autocomplete single or multi-words in left to right strategy very quickly
* Removal of item cleans up index

## Installation

Install **rediscomplete** and have it saved to your _package.json_ dependencies:
```
npm install rediscomplete --save
```

## Usage

Instantiate the RedisComplete library
```
var RedisComplete = require('rediscomplete');
var completor = new RedisComplete();
```
