/*
 * Copyright (c) 2015 Limerun Project Contributors
 * Portions Copyright (c) 2015 Internet of Protocols Assocation (IOPA)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Promise = require('bluebird');
var LRU = require('lru-cache');
var iopaStream = require('iopa-common-stream');

// GLOBALS

/** 
 * LRU exposed as context["server.Capabilities"]["iopaCache.Support"]["iopaCache.cache"].lru
 *
 * LRU cache for responses to avoid DDOS etc.
 * max packet size is 1280
 * 32 MB / 1280 = 26214
 * The max lifetime is roughly 200s per packet.
 * Which equates to ~131 packets/second
 *
 * @private
 */
var _db = LRU({
    max: (32768 * 1024),
    length: function(n) {
        return n.length
    },
    dispose: function(key, value) {
        for (var prop in value) {
            if (value.hasOwnProperty(prop)) {
                delete value[prop];
            }
        };
    }
});

/**
 * IOPA Middleware for Cache of Outgoing Messages on Servers/Clients
 *
 * @class Cache
 * @constructor
 * @public
 */
function Cache(app) {
      if (!app.properties["server.Capabilities"]["cache.Version"])
        throw ("Missing Dependency:  cache Server/Middleware in Pipeline");

    this._db = app.properties["server.Capabilities"]["cache.Support"]["cache.db"]();
}

/**
 * @method invoke
 * @param context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
Cache.prototype.invoke = function Cache_invoke(context, next) {
    if (!context["cache.DoNotCache"]) {
        var cacheData = {
            "server.InProcess": context["server.InProcess"],
            "server.IsLocalOrigin": context["server.IsLocalOrigin"],
            "iopa.CallCancelledSource": context["iopa.CallCancelledSource"],
            "iopa.Events": context["iopa.Events"],
            "server.RawStream": context["server.RawStream"]
        };

           var key = cacheKey(context);
              this._db.set(key, cacheData);
    
       // context["cache.DoNotCache"] = true;
   //     context["iopa.Events"].on('close', this._closeContext.bind(this, context));
    }
    
    var that = this;
      
    //HOOK INTO SEND PACKET PIPELINE
    // context["server.RawStream"] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context, context.response["server.RawStream"]));  
   return next().then(function(value){ 
        var key = cacheKey(context);
       that._db.del(key);
       return value;
    });
};

/**
 * @method _write
 * @this context IOPA context dictionary
 * @param nextStream  Raw Stream to send transformed data to
 * @param chunk     String | Buffer The data to write
 * @param encoding String The encoding, if chunk is a String
 * @param callback Function Callback for when this chunk of data is flushed
 * @private
*/
Cache.prototype._write = function Cache_write(context, nextStream, chunk, encoding, callback) {
     nextStream.write(chunk, encoding, callback);
};

module.exports.Cache = Cache;

function cacheKey(context) {
  
var result = "cache://";
   result += context["server.RemoteAddress"];  
   result += ":"+ context["server.RemotePort"];
 //  result += "/" + (context["server.IsRequest"]) ? 'request' : 'response' ;
   result += "/" + context["iopa.MessageId"] ;
  
  if (context["iopa.Token"])
    result += "/"+ context["iopa.Token"].toString('hex');
 
  return result;
}

/* *********************************************************
 * IOPA MIDDLEWARE: CACHE MIDDLEWARE SERVER EXTENSIONS
 * ********************************************************* */

/**
 * IOPA Middleware for Cache Matching on Incoming Responses
 *
 * @class CacheMatch
 * @constructor
 * @public
 */
function CacheMatch(app) {
    
    app.properties["server.Capabilities"]["cache.Version"] = "1.0";
    app.properties["server.Capabilities"]["cache.Support"] = {
        "cache.db": this.db
    };
}

CacheMatch.prototype.db = function() {
    return _db;
};

/**
 * @method invoke
 * @this channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CacheMatch.prototype.invoke = function CacheMatch_invoke(channelContext, next) {
    channelContext["iopa.Events"].on("response", this._client_invokeOnParentResponse.bind(this, channelContext));
    return next();
};

/**
 * @method _client_invokeOnParentResponse
 * @this CacheMatch
 * @param channelContext IOPA parent context dictionary
 * @param context IOPA childResponse context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CacheMatch.prototype._client_invokeOnParentResponse = function CacheMatch_client_invokeOnParentResponse(channelContext, context) {
    // SERVER REQUESTS ONLY;  IGNORE CLIENT RESPONSES
    //  if (!context["server.IsRequest"])
    //    return next();

    //CHECK CACHE
       var key = cacheKey(context);
  
    var cachedOriginal = _db.peek(key);

    if (cachedOriginal) {
              if (cachedOriginal["server.InProcess"]) {
             // TRANSFER ONTO EVENTS PIPELINE
             cachedOriginal["iopa.Events"].emit("response", context); 
        }
    }
};

module.exports.Match = CacheMatch;