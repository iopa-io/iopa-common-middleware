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
var iopaGeneric = require('../common/iopageneric.js')
var util = require('util');

const constants = require('iopa').constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER

const CACHE = {
    CAPABILITY: "urn:io.iopa:cache",
    DB: "cache.Db",
    DONOTCACHE: "cache.DoNotCache",
    MATCHED: "cache.Matched",
    MATCHANYHOST: "cache.MatchAnyHost"
}

const packageVersion = require('../../package.json').version;


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
    length: function (n) {
        return n.length
    },
    dispose: function (key, value) {
        for (var prop in value) {
            if (value.hasOwnProperty(prop)) {
                delete value[prop];
            }
        };
    }
});

function cacheKeyId(context, matchanyhost) {
    var result = "cache://";
    if (!matchanyhost)
        result += context[SERVER.RemoteAddress] + ":" + context[SERVER.RemotePort];
    result += "/&id=" + context[IOPA.MessageId];
    // console.log(result);
    return result;
}

function cacheKeyToken(context, matchanyhost) {

    var result = "cache://";
    if (!matchanyhost)
        result += context[SERVER.RemoteAddress] + ":" + context[SERVER.RemotePort];
    result += "/&token=" + context[IOPA.Token];

    return result;
}

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * IOPA Middleware for Cache of Outgoing Messages on Servers/Clients
 *
 * @class Cache
 * @constructor
 * @public
 */
function Cache(app) {
    _classCallCheck(this, Cache);
    iopaGeneric.call(this);

    if (!app.properties[SERVER.Capabilities][CACHE.CAPABILITY])
        throw ("Missing Dependency:  cache Server/Middleware in Pipeline");

    this._db = app.properties[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.DB]();
}

util.inherits(Cache, iopaGeneric);

/**
 * SERVER REQUEST IN
 *
 * @method requestin
 * @param context IOPA context dictionary
 * @returns void
 * @protected OVERRIDES
 */
Cache.prototype.requestin = function (context) {

}

/**
 * SERVER REQUEST OUT
 *
 * @method requestin
 * @param context IOPA context dictionary
 * @returns void
 * @protected OVERRIDES
 */
Cache.prototype.requestout = function (context) {
    this._cache(context);
}

/**
 * RESPONSE OUT (either for SERVER REQUEST OR FOR CLIENT REQUEST RESPONSE)
 *
 * @method responseout
 * @param context IOPA context dictionary
 * @returns void
 * @protected OVERRIDES
 */
Cache.prototype.responseout = function (context) {
    this._cache(context);
}

/**
 * @method _write
 * @this context IOPA context dictionary
 * @param nextStream  Raw Stream to send transformed data to
 * @param chunk     String | Buffer The data to write
 * @param encoding String The encoding, if chunk is a String
 * @param callback Function Callback for when this chunk of data is flushed
 * @private
*/
Cache.prototype._cache = function Cache_cache(context) {

    if (!context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.DONOTCACHE]) {
        var cacheData = {};
        cacheData[SERVER.IsLocalOrigin] = context[SERVER.IsLocalOrigin];
        cacheData[SERVER.CancelToken] = context[SERVER.CancelToken];
        cacheData[IOPA.Events] = context[IOPA.Events];
        cacheData[SERVER.RawStream] = context[SERVER.RawStream];
        cacheData[IOPA.Seq] = context[IOPA.Seq];
        cacheData[IOPA.MessageId] = context[IOPA.MessageId];

        var key = cacheKeyId(context, context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.MATCHANYHOST]);
        this._db.set(key, cacheData);
        if (context[IOPA.Token]) {
            key = cacheKeyToken(context, context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.MATCHANYHOST]);
            this._db.set(key, cacheData);
        }

        context[SERVER.CancelToken].onCancelled(this._closeContext.bind(this, context));

    };
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
    app.properties[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.DB] = function () { return _db; };
}

/**
 * @method invoke
 * @this channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CacheMatch.prototype.invoke = function CacheMatch_invoke(channelContext, next) {
    channelContext[IOPA.Events].on(IOPA.EVENTS.Response, this._invokeOnParentResponse.bind(this, channelContext));
    return next();
};

/**
 * @method dispatch
 * @this channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
CacheMatch.prototype.dispatch = function CacheMatch_dispatch(channelContext, next) {

    channelContext[IOPA.Events].on(IOPA.EVENTS.Response, this._invokeOnParentResponse.bind(this, channelContext));

   // channelContext.create = this.create.bind(this, channelContext, channelContext.create);

    return next();
};

var seq = 0;

/**
 * @method _client_invokeOnParentResponse
 * @this CacheMatch
 * @param channelContext IOPA parent context dictionary
 * @param context IOPA childResponse context dictionary
 */
CacheMatch.prototype._invokeOnParentResponse = function CacheMatch_invokeOnParentResponse(channelContext, context) {

    if (context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.MATCHED]) {
        return;
    }

    //CHECK CACHE
    var key = cacheKeyId(context);

    var cachedOriginal = _db.peek(key);
    if (!cachedOriginal) {
        key = cacheKeyId(context, true);
        cachedOriginal = _db.peek(key);
    }

    if (context[IOPA.Token]) {
        if (!cachedOriginal) {
            if (context[IOPA.Token]) {
                key = cacheKeyToken(context);
                cachedOriginal = _db.peek(key);
                if (!cachedOriginal) {
                    key = cacheKeyToken(context, true);
                    cachedOriginal = _db.peek(key);
                }
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
            //  context.log.info("[IOPA_CACHE_MATCH] MATCHED " + key + "    " + context[IOPA.Method] +" "+ context[IOPA.Seq] +"=" + cachedOriginal[IOPA.Seq]);

            // TRANSFER ONTO EVENTS PIPELINE
            context[SERVER.Capabilities][CACHE.CAPABILITY][CACHE.MATCHED] = context[IOPA.Seq];
            cachedOriginal[IOPA.Events].emit(IOPA.EVENTS.Response, context);

        } else {
            context.log.info("[IOPA_CACHE_MATCH] TOO LATE FOR PIPELINE " + context[IOPA.Method] + " " + context[IOPA.MessageId] + ":" + context[IOPA.Seq]);
            // silently ignore  TODO: Transfer to a different pipeline
        }
    } else {
        // context.log.info("[IOPA_CACHE_MATCH] UNKNOWN RESPONSE REFERENCE " + key + "    " + context[IOPA.Method] +" "+ context[IOPA.MessageId] +":" + context[IOPA.Seq]);
        // silently ignore    TODO: Transfer to a different pipeline
    }
};

module.exports.Match = CacheMatch;
