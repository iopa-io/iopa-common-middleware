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
    
        
const BACKFORTH = {CAPABILITY: "urn:io.iopa:backforth",
        CURRENTCHILD: "backForth.CurrentChild"
          }
 
 const packageVersion = require('../../package.json').version;
  
/**
 * IOPA Middleware 
 *
 * @class BackForth
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function BackForth(app) {
     app.properties[SERVER.Capabilities][BACKFORTH.CAPABILITY] = {};
     app.properties[SERVER.Capabilities][BACKFORTH.CAPABILITY][SERVER.Version] = packageVersion;
}

/**
 * @method invoke
 * @this context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
BackForth.prototype.channel = function BackForth_invoke(context, next) {
     context[IOPA.Events].on(IOPA.EVENTS.Response, this._client_invokeOnParentResponse.bind(this, context));
    return next();
};

/**
 * @method connect
 * @this context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
BackForth.prototype.connect = function BackForth_connect(context, next) {
     context[IOPA.Events].on(IOPA.EVENTS.Response, this._client_invokeOnParentResponse.bind(this, context));
    return next();
};


BackForth.prototype.dispatch = function BackForth_dispatch(context, next){
    context[SERVER.ParentContext][SERVER.Capabilities][BACKFORTH.CAPABILITY][BACKFORTH.CURRENTCHILD] = context;
    return next();
};

/**
 * @method _client_invokeOnParentResponse
 * @this context IOPA parent context dictionary
 * @param context IOPA childResponse context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
BackForth.prototype._client_invokeOnParentResponse = function BackForth_client_invokeOnParentResponse(parentContext, context) {
    if(BACKFORTH.CURRENTCHILD in  parentContext[SERVER.Capabilities][BACKFORTH.CAPABILITY])
   {
        var childRequest = parentContext[SERVER.Capabilities][BACKFORTH.CAPABILITY][BACKFORTH.CURRENTCHILD];
        childRequest[IOPA.Events].emit(IOPA.EVENTS.Response, context);
   }
};

module.exports = BackForth;