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
const constants = require('iopa-rest').constants,
    IOPA = constants.IOPA,
    SERVER = constants.SERVER
    
        
const PIPELINE = {CAPABILITY: "urn:io.iopa:pipeline",
        SENT: "pipeline.Sent"
          }
 
 const packageVersion = require('../../package.json').version;
  
/**
 * IOPA Middleware 
 *
 * @class PipelineMatch
 * @param app object the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public
 */
function PipelineMatch(app) {
     app.properties[SERVER.Capabilities][PIPELINE.CAPABILITY] = {};
     app.properties[SERVER.Capabilities][PIPELINE.CAPABILITY][SERVER.Version] = packageVersion;
}

/**
 * @method invoke
 * @this channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
PipelineMatch.prototype.invoke = function PipelineMatch_invoke(channelContext, next) {
     channelContext[SERVER.Capabilities][PIPELINE.CAPABILITY][PIPELINE.SENT] = [];
     channelContext[IOPA.Events].on(IOPA.EVENTS.Response, this._invokeOnParentResponse.bind(this, channelContext));
    return next();
};

/**
 * @method dispatch
 * @this channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
PipelineMatch.prototype.dispatch = function PipelineMatch_dispatch(channelContext, next){
  
     channelContext[IOPA.Events].on(IOPA.EVENTS.Response, this._invokeOnParentResponse.bind(this, channelContext));
    
     channelContext[SERVER.Capabilities][PIPELINE.CAPABILITY][PIPELINE.SENT] = [];
  
     channelContext.create = this.create.bind(this, channelContext, channelContext.create);
    
    return next();
};


/**
 * Creates a new IOPA Context that is a child request/response of a parent Context
 *
 * @method create
 *
 * @param parentContext IOPA Context for parent
 * @param url string representation of /hello to add to parent url
 * @param options object 
 * @returns context
 * @public
 */
PipelineMatch.prototype.create = function PipelineMatch_create(parentContext, next, url, options) {
   var context = next(url, options);

   if (context[SERVER.IsLocalOrigin])
     context[SERVER.ParentContext][SERVER.Capabilities][PIPELINE.CAPABILITY][PIPELINE.SENT].push(context);

   return context;
}

/**
 * Event handler for when a response is received from an outgoing client request on a parent channel
 * This handler finds the matched outgoing child context and transfers the event to the child
 * 
 * @method _invokeOnParentResponse
 * @param parentContext IOPA Context for parent
 * @param response IOPA resonse context dictionary for this event
 */
PipelineMatch.prototype._invokeOnParentResponse = function PipelineMatch_invokeOnParentResponse(parentContext, response) {
    if ((PIPELINE.SENT in  parentContext[SERVER.Capabilities][PIPELINE.CAPABILITY])
     && (parentContext[SERVER.Capabilities][PIPELINE.CAPABILITY][PIPELINE.SENT].length > 0))
   {
        var childRequest = parentContext[SERVER.Capabilities][PIPELINE.CAPABILITY][PIPELINE.SENT].shift();
        if (childRequest[IOPA.Events])
          childRequest[IOPA.Events].emit(IOPA.EVENTS.Response, response);
   }
};

module.exports = PipelineMatch;