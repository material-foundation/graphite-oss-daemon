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

var config = require('config');
var CronJob = require('cron').CronJob;
var GitHubApi = require("github");
var github = new GitHubApi({
    protocol: "https",
    host: "api.github.com",
    pathPrefix: null,
    headers: {
        "user-agent": "GitHubAnalytics"
    },
    timeout: 5000
});

if (config.get('github.key') && config.get('github.secret')) {
  github.authenticate({
    type: "oauth",
    key: config.get('github.key'),
    secret: config.get('github.secret')
  });
}

function post_org_stats(org) {
  var packet = {};
  packet["github.org."+org.login+".public_repos"] = parseInt(org.public_repos);
  process.send(packet);
}

function post_repo_stats(repo) {
  var keybase = "github.repo."+repo.owner.login+"."+repo.name;
  var interesting_keys = [
    'size',
    'stargazers_count',
    'watchers_count',
    'forks_count',
    'open_issues_count',
  ];

  var packet = {};
  for (var i in interesting_keys) {
    var key = interesting_keys[i];
    if (key in repo && repo[key] !== undefined && repo[key] !== null) {
      packet[keybase+"."+key] = parseInt(repo[key]);
    }
  }
  process.send(packet);
}

function query_public_repos(org_name) {
  github.orgs.get({'org': org_name}, function(err, res) {
    if (!err) {
      post_org_stats(res);
    }
  });
}

function process_org_repos(err, res) {
  if (err) {
    return false;
  }
  
  for (var i = 0; i < res.length; ++i) {
    var repo = res[i];
    post_repo_stats(res[i]);
  }
  
  if (github.hasNextPage(res)) {
    github.getNextPage(res, process_org_repos);
  }
}

var orgs = config.get('to_watch.orgs');
var repos_in_org = config.get('to_watch.repos_in_org');

function run() {
  if (orgs.length > 0) {
    new CronJob('15 15,45 * * * *', function() {
      for (var i in orgs) {
        query_public_repos(orgs[i]);
      }
    }, null, true, 'America/New_York');
  }

  if (repos_in_org.length > 0) {
    new CronJob('15 15,45 * * * *', function() {
      for (var i in repos_in_org) {
        github.repos.getForOrg({'org': repos_in_org[i]}, process_org_repos);
      }
    }, null, true, 'America/New_York');
  }
}

run();

// Initial population:

for (var i in orgs) {
  query_public_repos(orgs[i]);
}
for (var i in repos_in_org) {
  github.repos.getForOrg({'org': repos_in_org[i]}, process_org_repos);
}
