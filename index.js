#!/usr/bin/env node
/*
 Copyright 2016 The Graphite Daemon for Open Source Projects Authors. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License"); you may not
 use this file except in compliance with the License. You may obtain a copy
 of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 License for the specific language governing permissions and limitations
 under the License.
 */

// Watches all files in `lib/crons`. We start a daemon for every index.json.
// The daemon is expected to fetch information it plans to store in graphite.
// The daemon should extra relevant numbers and send a packet back to this host
// process via `process.send(packet)`.
//
// Example:
//
//     var packet = {"some.path": 1000};
//     process.send(packet);
//

var config = require('config');
var manager = require('daemon-manager');
var chokidar = require('chokidar');
var graphite = require("./lib/graphite")(
  config.get('graphite.server.host'),
  config.get('graphite.server.data_port'),
  config.get('graphite.server.web_port')
);

var watcher = chokidar.watch(__dirname + '/crons/', {
  ignored: /[\/\\]\./, persistent: true
});

var controllers = {};

watcher.on('add', function(path) {
  if (!path.endsWith('index.js')) {
    return;
  }

  controller = new manager.Controller({
    script: path,
    restartOnScriptChange: true
  });

  controller.on('childmessage', function(msg) {
    graphite.write(msg, function(err) {
      if (err) { console.error(err); }
    });
  });

  controller.launch();
});
