var Service = require('node-windows').Service;
const { WIN_SERVICE_NAME, WIN_SERVICE_DESCRIPTION, WIN_SERVICE_SCRIPT } = require('../conf.json');

// Create a new service object
var svc = new Service({
  name: WIN_SERVICE_NAME,
  wait: 60,
  description: WIN_SERVICE_DESCRIPTION,
  script: WIN_SERVICE_SCRIPT,
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

svc.on('install', function () {
  svc.start();
});

svc.install();
