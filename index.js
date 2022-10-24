const { getRecomandare2G } = require('./Tehn/GSM');
const dummyData = require('./dummy.json');

getRecomandare2G(dummyData).then(console.log)