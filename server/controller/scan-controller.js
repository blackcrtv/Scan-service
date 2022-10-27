const { getAllRecomand } = require("../../Tehn/allTehn");
const { getLastDateElastic, getElasticData } = require("../../database/elastic");
const { ES, errorLogFile, logFile } = require('../../conf.json');
const { insertLog } = require('../../Logs/formatLogs');

const getScanData = async (req, res, next) => {
    const ratScan = req.params.scanTehn;
    try {
        // Obtinem datele din elastic, prima data luam ultimul timestamp inregistrat pe care il folosim in urmatorul query in date range
        let lastDateBucket = await getLastDateElastic();
        if (!lastDateBucket) {
            throw {
                error: true,
                msg: 'Eroare select timestamp din elasticsearch',
                errorStatus: 4
            }
        }
        let lastDate = lastDateBucket.hits.hits[0]?._source["@timestamp"] || "2022-10-25T13:05:03.611Z";

        let dataResponse, responeElastic;

        switch (ratScan) {
            case "GSM":
                responeElastic = await getElasticData(ES.INDEX_GSM, lastDate);
                dataResponse = {
                    "GSM": responeElastic.hits.hits
                }
                break;
            case "UMTS":
                responeElastic = await getElasticData(ES.INDEX_UMTS, lastDate);
                dataResponse = {
                    "UMTS": responeElastic.hits.hits
                }
                break;
            case "LTE":
                responeElastic = await getElasticData(ES.INDEX_LTE, lastDate);
                dataResponse = {
                    "LTE": responeElastic.hits.hits
                }
                break;
            default:
                let dataGSM = await getElasticData(ES.INDEX_GSM, lastDate);
                let dataUMTS = await getElasticData(ES.INDEX_UMTS, lastDate);
                let dataLTE = await getElasticData(ES.INDEX_LTE, lastDate);
                dataResponse = {
                    "GSM": dataGSM.hits.hits,
                    "UMTS": dataUMTS.hits.hits,
                    "LTE": dataLTE.hits.hits
                }
                break;
        }
        res.json(dataResponse);
    } catch (error) {
        insertLog(error, errorLogFile);
        res.json({
            "GSM": [],
            "UMTS": [],
            "LTE": [],
            "error": error
        });
    }

}

const getNetworkEnv = async (req, res, next) => {
    const recTehn = req.params.recTehn;
    let sourceRecomand = [];
    let bucketElastic = {};

    try {
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

        switch (recTehn) {
            case "GSM":
                bucketElastic = await getElasticData(ES.INDEX_GSM, lastDate);
                sourceRecomand = getAllRecomand(bucketElastic.hits.hits);
                break;
            case "UMTS":
                bucketElastic = await getElasticData(ES.INDEX_UMTS, lastDate);
                sourceRecomand = getAllRecomand([], bucketElastic.hits.hits, []);
                break;
            case "LTE":
                bucketElastic = await getElasticData(ES.INDEX_LTE, lastDate);
                sourceRecomand = getAllRecomand([], [], bucketElastic.hits.hits);
                break;
            default:
                let dataGSM = await getElasticData(ES.INDEX_GSM, lastDate);
                let dataUMTS = await getElasticData(ES.INDEX_UMTS, lastDate);
                let dataLTE = await getElasticData(ES.INDEX_LTE, lastDate);

                sourceRecomand = getAllRecomand(dataGSM.hits.hits, dataUMTS.hits.hits, dataLTE.hits.hits);
                break;
        }
        res.json({
            "networkEnv": sourceRecomand
        })
    } catch (error) {
        insertLog(error, errorLogFile);
        res.json({
            "networkEnv": [],
            error
        })
    }
}

module.exports = {
    getScanData,
    getNetworkEnv
}