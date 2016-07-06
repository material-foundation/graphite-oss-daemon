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

// Light-weight client for posting data to graphite.

// Examples:
//
//     graphite.writeEvent('release', new Date(), null, null, function(err) {
//       console.log('Done');
//     });

var LazySocket = require('lazy-socket');
var url        = require('url');
var http       = require('http');

function GraphiteClient(host, data_port, web_port) {
  this._socket = null;

  this.host = host;
  this.data_port = data_port || 2003;
  this.web_port = web_port || 3500;
}

GraphiteClient.prototype.write = function(metrics, timestamp, cb) {
  if (typeof timestamp === 'function') {
    cb        = timestamp;
    timestamp = null;
  }

  timestamp = timestamp || Date.now();
  timestamp = Math.floor(timestamp / 1000);

  this._lazyConnect();

  var lines = '';
  for (var path in metrics) {
    var value = metrics[path];
    lines += [path, value, timestamp].join(' ') + '\n';
  }

  this._socket.write(lines, 'utf-8', cb);
};

// Creates a new event.
// @param what  A short description of the event.
// @param when  When the event occurred. If null, "now" is assumed.
// @param tags  Space-delimited tags. Is how you filter events in dashboards.
// @param data  Additional data to show alongside the event.
GraphiteClient.prototype.writeEvent = function(what, when, tags, data, cb) {
  when = when || Date.now();
  when = Math.floor(when / 1000);

  var post = {};
  if (what) { post['what'] = what; }
  if (when) { post['when'] = when; }
  if (tags) { post['tags'] = tags; }
  if (data) { post['data'] = data; }

  var post_data = JSON.stringify(post);
  var post_options = {
      host: this.host,
      port: this.web_port,
      path: '/events/',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(post_data)
      }
  };

  var post_req = http.request(post_options, function(res) {
    res.setEncoding('utf8');
    if (cb) { cb(); }
  });

  post_req.write(post_data);
  post_req.end();
};

GraphiteClient.prototype.end = function() {
  if (this._socket) this._socket.end();
};

// Private APIs

GraphiteClient.flatten = function(obj, flat, prefix) {
  flat   = flat || {};
  prefix = prefix || '';

  for (var key in obj) {
    var value = obj[key];
    if (typeof value === 'object') {
      this.flatten(value, flat, prefix + key + '.');
    } else {
      flat[prefix + key] = value;
    }
  }

  return flat;
};

GraphiteClient.prototype._lazyConnect = function() {
  if (this._socket) return;

  this._socket = LazySocket.createConnection(this.data_port, this.host);
};

module.exports = function (host, data_port, web_port) {
  return new GraphiteClient(host, data_port, web_port);
}
