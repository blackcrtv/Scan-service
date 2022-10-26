const { getAllRecomand } = require("./Tehn/allTehn");
const { checkDB } = require("./database/mysql");
const { getLastDateElastic , insertElasticWithId, getElasticData } = require("./database/elastic");
const { ES, errorLogFile, logFile, INTERVAL_SERVICE } = require('./conf.json');
const { insertLog } = require('./Logs/formatLogs');

const express = require('express')

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
});

const main = async () => {
    try {
        //1.Check DB
        let flagDB = await checkDB();
        if (!flagDB) {
            throw {
                error: true,
                msg: 'Eroare conexiune DB',
                errorStatus: 1
            }
        }
        if (flagDB.length === 0) {
            throw {
                error: true,
                msg: 'Nu exista status receptor',
                errorStatus: 2
            }
        }
        if (!(flagDB[0].status == 4 && flagDB[0].command_type == 'SCAN')) {
            return {
                error: false,
                msg: 'Receptorul nu se afla in scan activ',
                errorStatus: -1
            }
        }

        //2. Obtinem datele din elastic, prima data luam ultima data inregistrata pe care o folosim in urmatorul query in date range
        let lastDateBucket = await getLastDateElastic();
        if (!lastDateBucket) {
            throw {
                error: true,
                msg: 'Eroare select timestamp din elasticsearch',
                errorStatus: 4
            }
        }
        let lastDate = lastDateBucket.hits.hits[0]?._source["@timestamp"] || "2022-10-25T13:05:03.611Z";

        let dataGSM = await getElasticData(ES.INDEX_GSM, lastDate);
        let dataUMTS = await getElasticData(ES.INDEX_UMTS, lastDate);
        let dataLTE = await getElasticData(ES.INDEX_LTE, lastDate);

        //3. Pentru fiecare tehnologie vom obtine recomandarile
        let sourceRecomand = getAllRecomand(dataGSM.hits.hits, dataUMTS.hits.hits, dataLTE.hits.hits);

        //4. Inserare in ES cu update sau insert
        let insertResponse = await Promise.all(sourceRecomand.map(async (data) => {
            try {
                return await insertElasticWithId(ES.INDEX_RECOMANDARI, data);
            } catch (error) {
                return false
            }
        }));

        //5. Verificare daca exista vreo recomandare care nu a putut fi inserata 
        if (insertResponse.some(el => el.err === true)) {
            throw insertResponse.filter(el => el.err === true);
        }
        return {
            error: false,
            msg: 'All good!',
            errorStatus: -1
        };
    } catch (error) {
        insertLog(error, errorLogFile);
        throw error;
    }
}

let intervalMain = setInterval(async () => {
    try {
        let resultStatus = await main();
        insertLog(resultStatus, logFile);
    } catch (error) {
        console.log(error);
    }
}, INTERVAL_SERVICE);

