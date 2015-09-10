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
ClientSend.prototype.invoke = function ClientSend_invoke(context, next) {
    context[SERVER.Fetch] = this._fetch.bind(this, context, context[SERVER.Fetch]);
    context.send = this._send.bind(this, context);
    context.observe = this._observe.bind(this, context);
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
ClientSend.prototype._fetch = function ClientSend_fetch(context, nextFactory, path, options, pipeline) {
    return nextFactory(path, options, function (childContext) {
        childContext.send = this._client_send.bind(childContext);
        childContext.observe = this._client_observe.bind(childContext);
        childContext[IOPA.Events].on(IOPAEVENTS.Response, this.client_invokeOnResponse.bind(this, childContext));
        return pipeline(childContext);
    });
};

/**
 * @method send
 * @this context IOPA context dictionary
 * @param buf   optional data to write
 */
ClientSend.prototype._send = function ClientSend_send(context, path, options, buf){
    options = options || {};
    options[IOPA.Body] = new iopaStream.OutgoingStream(buf);
    return context[SERVER.Fetch](path, options, function(){
         return new Promise(function(resolve, reject){
                context["clientSend.Done"] = resolve;
            }); 
    });
};

/**
 * @method _client_send
 * @this context IOPA context dictionary
 * @param buf   optional data to write
 */
ClientSend.prototype._observe = function ClientSend_observe(context, path, options, callback){
    options = options || {};
    options[IOPA.Body] = new iopaStream.OutgoingNoPayloadStream();
    return context[SERVER.Fetch](path, options, function(){
         return new Promise(function(resolve, reject){
                context["clientSend.ObserveCallback"] = callback;
                context[IOPA.CallCancelled].onCancelled(resolve);
                context[IOPA.Events].on(IOPAEVENTS.Finish, resolve);
                context[IOPA.Events].on(IOPAEVENTS.Disconnect, resolve);
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
    if ("clientSend.Done" in context)
    {
       context["clientSend.Done"](responseContext);
    }
    
     if ("clientSend.ObserveCallback" in context)
       context["clientSend.ObserveCallback"](responseContext);
};

module.exports = ClientSend;