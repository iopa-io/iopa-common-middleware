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
 
 const util = require('util') ,
   iopaStream = require('iopa-common-stream');


/**
 * IOPA Middleware:  Log each incoming message
 *
 * @class AuditLog
 * @this app.properties  the IOPA AppBuilder Properties Dictionary
 * @constructor
 */
function MessageLogger(app) {
    
     app.properties["server.Capabilities"]["Log.Version"] = "1.0";
}

/**
 * @method invoke
 * @this context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
MessageLogger.prototype.invoke = function MessageLogger_invoke(context, next) {   
    context.response["server.RawStream"] = new iopaStream.OutgoingStreamTransform(this._write.bind(this, context, context.response["server.RawStream"]));  
    context["iopa.Events"].on("response", this._invokeOnParentResponse.bind(this, context));
   
    if(context["server.IsLocalOrigin"])
    {
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
MessageLogger.prototype._write = function _MessageLogger_write(context, nextStream, chunk, encoding, callback) {
   if(!context["server.IsLocalOrigin"])
             context.log.info("[IOPA] RESPONSE OUT " + _responseLog(context.response));
   
    nextStream.write(chunk, encoding, callback);
};

function _url(context)
{
    return  context["iopa.Scheme"] 
    + "//" + context["server.RemoteAddress"] 
    + ":" + context["server.RemotePort"] 
    + context["iopa.Path"]
    + (context["iopa.QueryString"]  ? + context["iopa.QueryString"]  : "");
}


function _requestLog(context)
{
    return   context["iopa.Method"] + " " + context["iopa.MessageId"] + ":" + context["iopa.Seq"] + " "
        +  _url(context) 
        + "  " + context["iopa.Body"].toString();
}

function _responseLog(response, chunk)
{
   
    return response["iopa.Method"] + " " + response["iopa.MessageId"] + ":" + response["iopa.Seq"] + " " 
   + response["iopa.StatusCode"] + "/" 
    + response["iopa.ReasonPhrase"] 
    + " [" + response["server.RemoteAddress"] 
    + ":" + response["server.RemotePort"] + "]" + "  " 
    + response["iopa.Body"].toString();
}

module.exports = MessageLogger;
