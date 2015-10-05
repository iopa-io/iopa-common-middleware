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
    SERVER = constants.SERVER
 
 const packageVersion = require('../../package.json').version;

/**
 * IOPA Middleware 
 *
 * @class Generic Middleware
 * @this app.properties  the IOPA AppBuilder Properties Dictionary, used to add server.capabilities
 * @constructor
 * @public MUSTINHERIT
 */
function GenericMiddleware(app) {
    }


// MUSTINERIT METHODS

/**
 * SERVER REQUEST IN
 *
 * @method requestin
 * @param context IOPA context dictionary
 * @returns void
 * @protected 
 */
GenericMiddleware.prototype.requestin = function(context){
    
}

/**
 * SERVER REQUEST OUT
 *
 * @method requestout
 * @param context IOPA context dictionary
 * @returns void
 * @protected
 */
GenericMiddleware.prototype.requestout = function(context){
    
}

/**
 * RESPONSE IN (either for CLIENT REQUEST OR FOR SERVER REQUEST RESPONSE)
 *
 * @method responsein
 * @param context IOPA context dictionary
 * @returns void
 * @protected
 */
GenericMiddleware.prototype.responsein = function(context){
    
}

/**
 * RESPONSE OUT (either to SERVER REQUEST OR to CLIENT REQUEST RESPONSE)
 *
 * @method responseout
 * @param context IOPA context dictionary
 * @returns void
 * @protected
 */
GenericMiddleware.prototype.responseout = function(context){
    
}

// STANDARD IOPA METHODS  (ABOVE ARE SIMPLIFICATIONS TO AVOID BOILERPLATE HOOKS IN A LOT OF MIDDLEWARE)

/**
 * @method invoke
 * @param context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
GenericMiddleware.prototype.channel = function GenericMiddleware_channel(channelContext, next) {
     channelContext[IOPA.Events].on(IOPA.EVENTS.Response, _invokeOnParentResponse.bind(this, channelContext));  
     return next();
};

/**
 * @method invoke
 * @param context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
GenericMiddleware.prototype.invoke = function GenericMiddleware_invoke(context, next) {
        this.requestin(context);
        return next();
   
};

/**
 * @method invoke
 * @param context IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
GenericMiddleware.prototype.connect = function GenericMiddleware_connect(context, next) {
     context[IOPA.Events].on(IOPA.EVENTS.Response, _invokeOnParentResponse.bind(this, context));
     return next();
};


/**
 * @method connect
 * @this context IOPA context dictionary
 */
GenericMiddleware.prototype.dispatch = function GenericMiddleware_dispatch(context, next) {
    if (context[SERVER.IsRequest])
       this.requestout(context);
    else
       this.responseout(context);
    
    return next();
}

/**
 * @method _invokeOnParentResponse
 * @this CacheMatch
 * @param channelContext IOPA parent context dictionary
 * @param context IOPA childResponse context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
function _invokeOnParentResponse(parentContext, response) {
   this.responsein(response);
};

module.exports = GenericMiddleware;
