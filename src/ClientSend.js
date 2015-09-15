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
      
 const constants = require('iopa').constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER
    
 const iopaStream = require('iopa-common-stream');
        
/**
 * IOPA Middleware 
 *
 * @class ClientSend
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function ClientSend(app) {
     app.properties[SERVER.Capabilities]["clientSend.Version"] = "1.0";
}

/**
 * @method invoke
 * @param context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
ClientSend.prototype.invoke = function ClientSend_invoke(channelContext, next) {
    channelContext[SERVER.Fetch] = this._fetch.bind(this, channelContext, channelContext[SERVER.Fetch]);
    channelContext.send = this._send.bind(this, channelContext);
    channelContext.observe = this._observe.bind(this, channelContext);
    return next();
};


/**
 * Context Func(tion) to create a new IOPA Request using a Tcp Url including host and port name
 *
 * @method fetch

 * @parm  path url representation of ://127.0.0.1/hello
 * @param options object dictionary to override defaults
 * @param pipeline function(context):Promise  to call with context record
 * @returns {Promise(context)}
 * @public
 */
ClientSend.prototype._fetch = function ClientSend_fetch(channelContext, nextFetch, path, options, pipeline) {
    var that = this;
    return nextFetch(path, options, function (childContext) {
        channelContext[IOPA.Events].on(IOPA.EVENTS.Response, that.client_invokeOnResponse.bind(this, childContext));
        return pipeline(childContext);
    });
};

/**
 * @method send
 * @this context IOPA context dictionary
 * @param buf   optional data to write
 */
ClientSend.prototype._send = function ClientSend_send(channelContext, path, options, buf){
     if (typeof options === 'string' || options instanceof String)
       options = { "iopa.Method": options};
   
    options = options || {};
    options[IOPA.Body] = new iopaStream.OutgoingStream(buf);
    return channelContext[SERVER.Fetch](path, options, function(childContext){
         return new Promise(function(resolve, reject){
                childContext["clientSend.Done"] = resolve;
            }); 
    });
};

/**
 * @method _client_send
 * @this context IOPA context dictionary
 * @param buf   optional data to write
 */
ClientSend.prototype._observe = function ClientSend_observe(channelContext, path, options, callback){
     if (typeof options === 'string' || options instanceof String)
       options = { "iopa.Method": options};
   
    options = options || {};
    options[IOPA.Body] = new iopaStream.OutgoingNoPayloadStream();
    return channelContext[SERVER.Fetch](path, options, function(childContext){
         return new Promise(function(resolve, reject){
                childContext["clientSend.ObserveCallback"] = callback;
                childContext["clientSend.Done"] = resolve;
                childContext[IOPA.CallCancelled].onCancelled(resolve);
                childContext[IOPA.Events].on(IOPA.EVENTS.Finish, resolve);
                childContext[IOPA.Events].on(IOPA.EVENTS.Disconnect, resolve);
            }); 
    });
};

/**
 * @method _client_invokeOnParentResponse
 * @param context IOPA request context dictionary
 * @param responseContext IOPA responseContext context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
ClientSend.prototype.client_invokeOnResponse = function ClientSend_client_invokeOnResponse(context, responseContext) {
     if (context["clientSend.Done"])
    {
       context["clientSend.Done"](responseContext);
       context["clientSend.Done"] = null;
    }
       
     if (context["clientSend.ObserveCallback"])
       context["clientSend.ObserveCallback"](responseContext);
};

module.exports = ClientSend;