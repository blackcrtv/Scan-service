const express = require('express');
const scanController = require('../controller/scan-controller');

const router = express.Router();

router.get('/scan/:scanTehn', scanController.getScanData);
router.get('/network-env/:recTehn', scanController.getNetworkEnv);

module.exports = router;