const { getRecomandare2G } = require('./GSM');
const { getRecomandare3G } = require('./UMTS');
const { getRecomandare4G } = require('./LTE');

module.exports = {
    getRecomandare2G,
    getRecomandare3G,
    getRecomandare4G
}