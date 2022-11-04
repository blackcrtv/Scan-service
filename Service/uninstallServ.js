var Service = require('node-windows').Service;
const { WIN_SERVICE_NAME, WIN_SERVICE_SCRIPT } = require('../conf.json');
// Create a new service object
var svc = new Service({
  name: WIN_SERVICE_NAME,
  script: WIN_SERVICE_SCRIPT
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function () {
  console.log('Uninstall complete.');
  console.log('The service exists: ', svc.exists);
});

// Uninstall the service.
svc.uninstall();