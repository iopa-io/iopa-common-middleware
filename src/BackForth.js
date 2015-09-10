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

// DEPENDENCIES
const constants = require('iopa').constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER
  
/**
 * IOPA Middleware 
 *
 * @class BackForth
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function BackForth(app) {
     app.properties[SERVER.Capabilities]["backForth.Version"] = "1.0";
}

/**
 * @method invoke
 * @this context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
BackForth.prototype.invoke = function BackForth_invoke(context, next) {
    context[SERVER.Fetch] = this._client_fetch.bind(this, context, context[SERVER.Fetch]);
    context[IOPA.Events].on(IOPA.EVENTS.Response, this._client_invokeOnParentResponse.bind(this, context));
    return next();
};

/**
 * Context Func(tion) to create a new IOPA Request using a Tcp Url including host and port name
 *
 * @method _client_fetch

 * @parm {string} path url representation of ://127.0.0.1/hello
 * @parm {string} [method]  request method (e.g. 'GET')
 * @returns {Promise(context)}
 * @public
 */
BackForth.prototype._client_fetch = function BackForth_client_fetch(parentContext, nextFactory, path, options, pipeline){
    return nextFactory(path, options, function(childContext){
         parentContext["backForth.CurrentChild"] = childContext;
         return pipeline(childContext);
    });
};

/**
 * @method _client_invokeOnParentResponse
 * @this context IOPA parent context dictionary
 * @param context IOPA childResponse context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
BackForth.prototype._client_invokeOnParentResponse = function BackForth_client_invokeOnParentResponse(parentContext, context) {
    if("server.currentChild" in parentContext)
   {
        var childRequest = parentContext["backForth.CurrentChild"];
        childRequest[IOPA.Events].emit(IOPA.EVENTS.Response, context);
   }
};

module.exports = BackForth;