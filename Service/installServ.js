var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'Network Env Service',
  wait: 60,
  description: 'Realizeaza si insereaza in elasticsearch recomandarile pentru tehnologiile GSM/UMTS/LTE',
  script: './index.js',
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

svc.on('install',function(){
  svc.start();
});

svc.install();
