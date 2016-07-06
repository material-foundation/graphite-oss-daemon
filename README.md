# Graphite Daemon for Open Source Projects

## Requirements

- A running graphite instance that can be posted to by the machine running this daemon.

## How to start the daemon

First create a copy of `config/default.json`. Call it `config/local.json`. Fill in your specific
graphite server information.

You may wish to configure the specific cron jobs before continuing.

To start the daemon:

    npm install
    node index.js

## Crons

### GitHub

Fetches GitHub statistics and stores them in the following structure:

    github.org.<name>.public_repos
    github.repo.<owner>.<name>.size
                              .stargazers_count
                              .watchers_count
                              .forks_count
                              .open_issues_count

Configuration:

Copy default.json to local.json:

    cp crons/github/config/default.json crons/github/config/local.json

And provide a key and secret. These can be obtained by
[registering a new GitHub application](https://github.com/settings/applications/new).

Providing a key/secret gives you a higher API rate limit.

## How to create new crons

Create a new folder in the `crons/` directory.

Create an index.js file.

Set up crons:

    var CronJob = require('cron').CronJob;
    
    new CronJob('* * * * * *', function() {
      console.log("This will print once a second.");
    }, null, true, 'America/New_York');

### Sending data to graphite

Crons can send data to graphite via inter-process communication:

    var packet = {"some.key.path": 1000};
    process.send(packet);

## License

Licensed under the Apache 2.0 license. See LICENSE for details.
