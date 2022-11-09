const express = require('express');
const scanController = require('../controller/scan-controller');

const router = express.Router();

router.post('/scan/:scanTehn', scanController.getScanData);
router.post('/network-env/:recTehn', scanController.getNetworkEnv);

module.exports = router;