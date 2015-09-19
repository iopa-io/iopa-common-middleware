/*
 * Copyright (c) 2015 Internet of Protocols Alliance (IOPA)
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

var LRU = require('lru-cache');
var iopaStream = require('iopa-common-stream');

const constants = require('iopa').constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER
    
const CACHE = {CAPABILITY: "urn:io.iopa:cache",
     DB: "cache.Db",
     DONOTCACHE: "cache.DoNotCache",
     MATCHED: "cache.Matched"
      }
 
 const packageVersion = require('../package.json').version;


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

function cacheKeyId(context) {
  
    var result = "cache://";
       result += context[SERVER.RemoteAddress];  
       result += ":"+ context[SERVER.RemotePort];
                //  result += "/" + (context[SERVER.IsRequest]) ? 'request' : 'response' ;
      result += "/&id=" + context[IOPA.MessageId] ;
     
      return result;
}

function cacheKeyToken(context) {
  
    var result = "cache://";
       result += context[SERVER.RemoteAddress];  
       result += ":"+ context[SERVER.RemotePort];
                 //  result += "/" + (context["server.IsRequest"]) ? 'request' : 'response' ;
      result += "/&token=" + context[IOPA.Token] ;
    
      return result;
}

/**
 * IOPA Middleware for Cache of Outgoing Messages on Servers/Clients
 *
 * @class Cache
 * @constructor
 * @public
 */
function Cache(app) {
      if (!app.properties[SERVER.Capabilities][CACHE.CAPABILITY])
        throw ("Missing Dependency:  cache Server/Middleware in Pipeline");

    this._db = app.properties[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.DB]();
}

/**
 * Handle inbound server requests (to add features for outbound request-responses)
 * @method invoke
 * @param context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
Cache.prototype.invoke = function Cache_invoke(context, next) {
    context.response[SERVER.RawStream] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context.response, context.response["server.RawStream"])); 
    return next();
};

/**
 * @method dispatch
 * @param next   IOPA application delegate for the remainder of the pipeline
 * @param context IOPA context dictionary
 */
Cache.prototype.dispatch = function Cache_dispatch(context, next){ 
    context[SERVER.RawStream] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context, context["server.RawStream"])); 
    return next();
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
   
     if (!context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.DONOTCACHE]) 
     {
         var cacheData = {};
            cacheData[SERVER.IsLocalOrigin] = context[SERVER.IsLocalOrigin];
            cacheData[SERVER.CallCancelledSource] = context[SERVER.CallCancelledSource];
            cacheData[IOPA.Events] = context[IOPA.Events];
            cacheData[SERVER.RawStream] = context[SERVER.RawStream];
            cacheData[IOPA.Seq] = context[IOPA.Seq];
            cacheData[IOPA.MessageId] = context[IOPA.MessageId];
              
            var key = cacheKeyId(context);
            
            this._db.set(key, cacheData);
            
            if (context[IOPA.Token])
            {
               key = cacheKeyToken(context);
               this._db.set(key, cacheData);
            } 
     } ;
   
     context[IOPA.Events].on(IOPA.EVENTS.Finish, this._closeContext.bind(this, context));
     nextStream.write(chunk, encoding, callback);
};

/**
 * @method _closeContext
 * @this context IOPA context dictionary
 * @private
*/
Cache.prototype._closeContext = function Cache_close(context, key) {
       this._db.del(key);
};

module.exports.Cache = Cache;

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
     app.properties[SERVER.Capabilities][CACHE.CAPABILITY] = {};
     app.properties[SERVER.Capabilities][CACHE.CAPABILITY][SERVER.Version] = packageVersion;
     app.properties[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.DB] = function() { return _db; };
}

/**
 * Handle inbound server connections
 * @method invoke
 * @param context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CacheMatch.prototype.channel = function CacheMatch_channel(channelContext, next) {
   channelContext[IOPA.Events].on(IOPA.EVENTS.Response, this._client_invokeOnParentResponse.bind(this, channelContext));  
   return next();
};

/**
 * Handle outbound client connections
 * @method connect 
 * @param context IOPA channelContext dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CacheMatch.prototype.connect = function CacheMatch_connect(channelContext, next) {
     channelContext[IOPA.Events].on(IOPA.EVENTS.Response, this._client_invokeOnParentResponse.bind(this, channelContext));
     return next();
};

 var seq = 0;
   
/**
 * @method _client_invokeOnParentResponse
 * @this CacheMatch
 * @param channelContext IOPA parent context dictionary
 * @param context IOPA childResponse context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CacheMatch.prototype._client_invokeOnParentResponse = function CacheMatch_client_invokeOnParentResponse(channelContext, context) {
    if (context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.MATCHED])
    {   
          return;
        }

    //CHECK CACHE
    var key = cacheKeyId(context);
   
    var cachedOriginal = _db.peek(key);
    
    if (context[IOPA.Token])
    {
        if (!cachedOriginal) {  
            if (context[IOPA.Token])
            {
            key = cacheKeyToken(context);
            cachedOriginal = _db.peek(key);
            }
        } else {
            if (context[IOPA.Token] && cachedOriginal[IOPA.Token] &&
                (context[IOPA.Token] !== cachedOriginal[IOPA.Token])) {
                cachedOriginal = undefined;
            }
        }
    }

    if (cachedOriginal) {
        if (cachedOriginal[IOPA.Events]) {
        //  context.log.info("[IOPA_CACHE_MATCH] MATCHED " + cacheKeyId(context) + "    " + context[IOPA.Method] +" "+ context[IOPA.Seq] +"=" + cachedOriginal[IOPA.Seq]);
           
            // TRANSFER ONTO EVENTS PIPELINE
           context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.MATCHED] = context[IOPA.Seq];
            cachedOriginal[IOPA.Events].emit(IOPA.EVENTS.Response, context);

        } else {
            context.log.info("[IOPA_CACHE_MATCH] TOO LATE FOR PIPELINE " + context[IOPA.Method] + " " + context[IOPA.MessageId] + ":" + context[IOPA.Seq]);
            // silently ignore  TODO: Transfer to a different pipeline
        }
    } else {
      //   context.log.info("[IOPA_CACHE_MATCH] UNKNOWN RESPONSE REFERENCE " + cacheKeyId(context) + "    " + context[IOPA.Method] +" "+ context[IOPA.MessageId] +":" + context[IOPA.Seq]);
        // silently ignore    TODO: Transfer to a different pipeline
    }
};

module.exports.Match = CacheMatch;
