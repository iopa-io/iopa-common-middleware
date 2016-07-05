/* global = */
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
 
 const CLIENTSEND = {
     CAPABILITY: "urn:io.iopa:clientSend",
     DONE: "clientSend.Done",
     OBSERVE: "clientSend.Observe"
     }
 
 const packageVersion = require('../../package.json').version;
        
/**
 * IOPA Middleware 
 *
 * @class ClientSend
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function ClientSend(app) {
     app.properties[SERVER.Capabilities][CLIENTSEND.CAPABILITY] = {};
     app.properties[SERVER.Capabilities][CLIENTSEND.CAPABILITY][SERVER.Version] = packageVersion;
 }

/**
 * @method dispatch
 * @this channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
ClientSend.prototype.dispatch = function PipelineMatch_dispatch(channelContext, next){
    channelContext.create = this.create.bind(this, channelContext, channelContext.create);
    return next();
};

/**
 * Creates a new IOPA Context that is a child request/response of a parent Context
 *
 * @method createChildContext
 *
 * @param parentContext IOPA Context for parent
 * @param next IOPA application delegate for the remainder of the createContext pipeline
 * @param url string representation of /hello
 * @param options object 
 * @returns context
 * @public
 */
ClientSend.prototype.create = function ClientSend_create(parentContext, next, url, options){ 
    var context = next(url, options);

    context.send = this._send.bind(this, context);
    context.observe = this._observe.bind(this, context);
    context[IOPA.Events].on(IOPA.EVENTS.Response, this._invokeOnResponse.bind(this, context));

    return context;
};

/**
 * @method send
 * @this context IOPA context dictionary
 * @param buf   optional data to write
 */
ClientSend.prototype._send = function ClientSend_send(context, body) {
       var p = new Promise(function (resolve, reject) {
                    context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.DONE] = resolve;
                    context[IOPA.Body].end(body || '');
                });
       
       return context.using(p);
};

/**
 * @method _client_send
 * @this context IOPA context dictionary
 * @param buf   optional data to write
 */
ClientSend.prototype._observe = function ClientSend_observe(context, callback) {   
    var p = new Promise(function (resolve, reject) {
                    context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.OBSERVE] = callback;
                       context[SERVER.CancelToken].onCancelled(resolve);
                });
       
   return context.using(p);
};

/**
 * @method _client_invokeOnParentResponse
 * @param context IOPA request context dictionary
 * @param responseContext IOPA responseContext context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
ClientSend.prototype._invokeOnResponse = function ClientSend_invokeOnResponse(context, responseContext) {

    if (context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.DONE]) {
        context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.DONE](responseContext);
        context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.DONE] = null;
    }

    if (context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.OBSERVE]) {
        context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.OBSERVE](responseContext);
    }

};

module.exports = ClientSend;