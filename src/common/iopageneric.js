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
GenericMiddleware.prototype.requestin = function (context) {

}

/**
 * SERVER REQUEST OUT
 *
 * @method requestout
 * @param context IOPA context dictionary
 * @returns void
 * @protected
 */
GenericMiddleware.prototype.requestout = function (context) {

}

/**
 * RESPONSE IN (either for CLIENT REQUEST OR FOR SERVER REQUEST RESPONSE)
 *
 * @method responsein
 * @param context IOPA context dictionary
 * @returns void
 * @protected
 */
GenericMiddleware.prototype.responsein = function (context, next) {

}

/**
 * RESPONSE OUT (either to SERVER REQUEST OR to CLIENT REQUEST RESPONSE)
 *
 * @method responseout
 * @param context IOPA context dictionary
 * @returns void
 * @protected
 */
GenericMiddleware.prototype.responseout = function (context) {

}

// STANDARD IOPA METHODS  (ABOVE ARE SIMPLIFICATIONS TO AVOID BOILERPLATE HOOKS IN A LOT OF MIDDLEWARE)

/**
 * @method invoke
 * @this channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
GenericMiddleware.prototype.invoke = function GenericMiddleware_invoke(context, next) {
    this.responsein(context)
    return next();
};

/**
 * @method dispatch
 * @this channelContext IOPA context dictionary
 * @param next   IOPA application delegate for the remainder of the pipeline
 */
GenericMiddleware.prototype.dispatch = function GenericMiddleware_dispatch(channelContext, next) {
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
GenericMiddleware.prototype.create = function GenericMiddleware_create(parentContext, next, url, options) {
    var context = next(url, options);

    context.send = this._send.bind(this, context, context.send);
    context[IOPA.Events].on(IOPA.EVENTS.Response, this._invokeOnResponse.bind(this, context));

    return context;
};

/**
 * Event handler for when a response is received from an outgoing client request on a parent channel
 * This handler finds the matched outgoing child context and transfers the event to the child
 * 
 * @method _invokeOnParentResponse
 * @param parentContext IOPA Context for parent
 * @param response IOPA resonse context dictionary for this event
 */
GenericMiddleware.prototype._invokeOnResponse = function GenericMiddleware_invokeOnResponse(parentContext, response) {
    this.responsein(response);
};

/**
 * @method send
 * @this context IOPA context dictionary
 * @param buf   optional data to write
 */
GenericMiddleware.prototype._send = function GenericMiddleware_send(context, next, body) {
    if (context[SERVER.IsRequest])
        this.requestout(context);
    else
        this.responseout(context);

    return next(body);
};

module.exports = GenericMiddleware;
