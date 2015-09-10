# [![IOPA](http://iopa.io/iopa.png)](http://iopa.io)<br> iopa-common-middleware 

[![Build Status](https://api.shippable.com/projects/55f1af651895ca4474147466/badge?branchName=master)](https://app.shippable.com/projects/55f1af651895ca4474147466) 
[![IOPA](https://img.shields.io/badge/iopa-middleware-99cc33.svg?style=flat-square)](http://iopa.io)
[![limerun](https://img.shields.io/badge/limerun-certified-3399cc.svg?style=flat-square)](https://nodei.co/npm/limerun/)

[![NPM](https://nodei.co/npm/iopa-common-middleware.png?downloads=true)](https://nodei.co/npm/iopa-common-middleware/)

## About
`iopa-common-middleare` is a core set of IOPA middleware for building self-hosted servers  

Written in plain javascript for maximum portability to constrained devices

## Status

Working prototype

Includes:

### IOPA BackForth (middleware)

  * Automatically matches requests and responses between connected devices based on sequential conversation


### IOPA Cache and Match (middleware)

  * Automatic caching of outbound requests
  * Automatic matching of inbound responses to original requests based on session and message identifiers
  * Compatible with any transport including MQTT, CoAP and raw TCP / UDP
  
  
### IOPA ClientSend (middleware)

  * Adds helper methods `.send()` and `.observe()` to IOPA context requests
  * These methods return a promise which complete on response
  
  
### IOPA Log (middleware)

  * Automatic audit logging of outbound and inbound requests and responses


### IOPA Server (reference class)

  * Base framework to write your own IoPA server (e.g., MQTT over TCP)
  
    
## Installation

    npm install iopa-common-middleware

## Usage
``` js
const iopa = require('iopa')
    , BackForth = require('iopa-common-middleware').BackForth
    , CacheMatch = require('iopa-common-middleware').Cache
    , ClientSend = require('iopa-common-middleware').ClientSend
    , MessageLogger = require('iopa-common-middleware').MessageLogger
       
function MyProtocolServer(options, appFunc) {

:

app.use(BackForth);
app.use(CacheMatch.Cache);
app.use(ClientSend);
app.use(MessageLogger);

:


``` 
       
See [`iopa-mqtt`](https://nodei.co/npm/iopa-mqtt/) for a reference implementation of this repository
