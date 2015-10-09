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
 
 global.Promise = require('bluebird');
 
const iopaMiddleware = require('../index.js'),
  stubServer = require('iopa-test').stubServer,
  Pipeline = require('../index.js').Pipeline,
   Cache = require('../index.js').Cache,
  ClientSend = require('../index.js').ClientSend

  
var should = require('should');
const iopa = require('iopa');

describe('#Pipeline()', function () {
    it('should have Pipeline', function () {
        iopaMiddleware.should.have.property("Pipeline");
    });

    var seq = 0;

    it('should use Pipeline', function (done) {

        var app = new iopa.App();
        app.use(ClientSend);
        app.use(Pipeline);
    
        app.use(function (context, next) {
            context.response["server.RawStream"].end("HELLO WORLD " + seq++);
            return next();
        });

        var server = stubServer.createServer(app.build())
      
        server.connect("urn://localhost").then(function (client) {
            var context = client.create("/projector", "GET");
            
           return context.send()
        }).then(function () { done();
        })



    });
});

describe('#Cache()', function () {
    it('should have Cache', function () {
        iopaMiddleware.should.have.property("Cache");
    });

    var seq = 0;

    it('should cache outgoing responses', function (done) {

        var app = new iopa.App();

        app.use(Cache.Match);
        app.use(Cache.Cache);

        app.use(function (context, next) {
            context.response["server.RawStream"].end("HELLO WORLD " + seq++);
            return next();
        });

        var server = stubServer.createServer(app.build())

        server.receive("TEST");

        process.nextTick(function () {
            done();
        });

    })

    it('should cache and match outgoing messages and responses', function (done) {

        var app = new iopa.App();

        app.use(Cache.Match);
        app.use(Cache.Cache);
    
        app.use(function (context, next) {
            context.response["server.RawStream"].end("HELLO WORLD " + seq++);
            return next();
        });

        var server = stubServer.createServer(app.build())
   
        server.connect("urn://localhost").then(function (client) {
            var context = client.create("/projector", "GET");
             context["server.RawStream"].end("HELLO WORLD " + seq++);
             return context.dispatch();
        }).then(function () {
            process.nextTick(function () {
                done();
            });
        })


    })
});

describe('#ClientSend()', function () {
    it('should have ClientSend', function () {
        iopaMiddleware.should.have.property("ClientSend");
    });

    var seq = 0;

    it('should send outgoing messages', function (done) {

        var app = new iopa.App();

        app.use(ClientSend);
        app.use(Pipeline);

        app.use(function (context, next) {
            context.response["server.RawStream"].end("HELLO WORLD " + seq++);
            return next();
        });

        var server = stubServer.createServer(app.build())
   
        server.connect("urn://localhost").then(function (client) {

            return client.create("/projector", "GET").send();
        }).then(function () {
            process.nextTick(function () {
                done();
            });
        })


    })
});
