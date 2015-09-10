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

const util = require('util'),
    iopaStream = require('iopa-common-stream');
    
const constants = require('iopa').constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER,
    METHODS = constants.METHODS,
    PORTS = constants.PORTS,
    SCHEMES = constants.SCHEMES,
    PROTOCOLS = constants.PROTOCOLS,
    IOPAEVENTS = constants.EVENTS,
    APP = constants.APP,
    COMMONKEYS = constants.COMMONKEYS,
    OPAQUE = constants.OPAQUE,
    WEBSOCKET = constants.WEBSOCKET,
    SECURITY = constants.SECURITY;

/**
 * IOPA Middleware:  Log each incoming message
 *
 * @class AuditLog
 * @this app.properties  the IOPA AppBuilder Properties Dictionary
 * @constructor
 */
function MessageLogger(app) {

    app.properties[SERVER.Capabilities]["Log.Version"] = "1.0";
}

/**
 * @method invoke
 * @this context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
MessageLogger.prototype.invoke = function MessageLogger_invoke(context, next) {
    if (!context[SERVER.IsRequest] && context[SERVER.IsLocalOrigin])
        context[SERVER.RawStream] = new iopaStream.OutgoingStreamTransform(this._writeResponse.bind(this, context, context[SERVER.RawStream]));
    else if (!context[SERVER.IsLocalOrigin])
        context.response[SERVER.RawStream] = new iopaStream.OutgoingStreamTransform(this._writeResponse.bind(this, context, context.response[SERVER.RawStream]));

    context[IOPA.Events].on(IOPAEVENTS.Response, this._invokeOnParentResponse.bind(this, context));

    if (context[SERVER.IsLocalOrigin] && context[SERVER.IsRequest]) {
        context.log.info("[IOPA] REQUEST OUT " + _requestLog(context))
        return next();
    } else if (context["server.IsRequest"]) {
        context.log.info("[IOPA] REQUEST IN " + _requestLog(context))
        return next();
    };
    // IGNORE ALL OTHER
    return next();
};

/**
 * @method _invokeOnParentResponse
 * @this CacheMatch
 * @param channelContext IOPA parent context dictionary
 * @param context IOPA childResponse context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
MessageLogger.prototype._invokeOnParentResponse = function MessageLogger_invokeOnParentResponse(channelContext, context) {
    context.log.info("[IOPA] RESPONSE IN " + _responseLog(context))
};

/**
 * @method _write
 * @param context IOPA context dictionary
 * @param nextStream Stream The raw stream saved that is next in chain for writing
 * @param chunk     String | Buffer The data to write
 * @param encoding String The encoding, if chunk is a String
 * @param callback Function Callback for when this chunk of data is flushed
 * @private
*/
MessageLogger.prototype._writeResponse = function _MessageLogger_writeResponse(context, nextStream, chunk, encoding, callback) {
    if (!context[SERVER.IsLocalOrigin])
        context.log.info("[IOPA] RESPONSE OUT " + _responseLog(context.response));
    else
        context.log.info("[IOPA] RESPONSE OUT " + _responseLog(context));

    nextStream.write(chunk, encoding, callback);
};

function _url(context) {
    return context[IOPA.Scheme]
        + "//" + context[SERVER.RemoteAddress]
        + ":" + context[SERVER.RemotePort]
        + context[IOPA.Path]
        + (context[IOPA.QueryString] ? + context[IOPA.QueryString] : "");
}


function _requestLog(context) {
    return context[IOPA.Method] + " " + context[IOPA.MessageId] + ":" + context[IOPA.Seq] + " "
        + _url(context)
        + "  " + context[IOPA.Body].toString();
}

function _responseLog(response, chunk) {

    return response[IOPA.Method] + " " + response[IOPA.MessageId] + ":" + response[IOPA.Seq] + " "
        + response[IOPA.StatusCode] + "/"
        + response[IOPA.ReasonPhrase]
        + " [" + response[SERVER.RemoteAddress]
        + ":" + response[SERVER.RemotePort] + "]" + "  "
        + response[IOPA.Body].toString();
}

module.exports = MessageLogger;
