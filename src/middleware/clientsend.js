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
 * Handle outbound client connections
 * @method create 
 * @param context IOPA channelContext dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
ClientSend.prototype.create = function ClientSend_create(context, next) {
    context.send = this._send.bind(this, context); 
    context.observe = this._send.bind(this, context);
    return next();
};

/**
 * @method dispatch
 * @param parentContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 * @param context IOPA context dictionary
 */
ClientSend.prototype.dispatch = function ClientSend_dispatch(context, next){ 
    context[IOPA.Events].on(IOPA.EVENTS.Response, this.client_invokeOnResponse.bind(this, context));
    return next();
};

/**
 * @method send
 * @this context IOPA context dictionary
 * @param buf   optional data to write
 */
ClientSend.prototype._send = function ClientSend_send(context) {
    return context.dispatch().then(new Promise(function (resolve, reject) {
        context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.DONE] = resolve;
    }));
};

/**
 * @method _client_send
 * @this context IOPA context dictionary
 * @param buf   optional data to write
 */
ClientSend.prototype._observe = function ClientSend_observe(context, callback) {
    return context.dispatch().then(
        new Promise(function (resolve, reject) {
            context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.OBSERVE] = callback;
            context[IOPA.CancelToken].onCancelled(resolve);
        }));
};

/**
 * @method _client_invokeOnParentResponse
 * @param context IOPA request context dictionary
 * @param responseContext IOPA responseContext context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
ClientSend.prototype.client_invokeOnResponse = function ClientSend_client_invokeOnResponse(context, responseContext) {

    if (context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.DONE]) {
        context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.DONE](responseContext);
        context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.DONE] = null;
    }

    if (context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.OBSERVE]) {
        context[SERVER.Capabilities][CLIENTSEND.CAPABILITY][CLIENTSEND.OBSERVE](responseContext);
    }

};

module.exports = ClientSend;