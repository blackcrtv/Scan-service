const { getAllRecomand } = require("../../Tehn/allTehn");
const { getLastDateElastic, getElasticData, getTagTimestamp, getElasticDataWithTag } = require("../../database/elastic");
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
        // let lastDate = lastDateBucket.hits.hits[0]?._source["timestampPrimit"] || "2022-10-25T13:05:03.611Z";
        let aggData = await getTagTimestamp();
        if (!aggData) {
            throw {
                error: true,
                msg: 'Eroare select timestamp/tag din elasticsearch',
                errorStatus: 4
            }
        }

        let structTehn = aggData.tehn.buckets?.reduce((acc, curr) => {
            let mapper = {
                "index_scan_beta_2g": "GSM",
                "index_scan_beta_3g": "UMTS",
                "index_scan_beta_4g": "LTE"
            }

            return acc = {
                ...acc, [mapper[curr.key]]: {
                    timestamp: curr.timestamp.buckets[0].key_as_string,
                    tags: curr.tag.buckets.map(el => el.key)
                }
            }

        }, {
            "GSM": {},
            "UMTS": {},
            "LTE": {}
        });

        let dataResponse, responeElastic;

        switch (ratScan) {
            case "GSM":
                responeElastic = await getElasticDataWithTag(ES.INDEX_GSM, structTehn[ratScan].timestamp, structTehn[ratScan].tags);
                dataResponse = {
                    "GSM": responeElastic.hits.hits
                }
                break;
            case "UMTS":
                responeElastic = await getElasticDataWithTag(ES.INDEX_UMTS, structTehn[ratScan].timestamp, structTehn[ratScan].tags);
                dataResponse = {
                    "UMTS": responeElastic.hits.hits
                }
                break;
            case "LTE":
                responeElastic = await getElasticDataWithTag(ES.INDEX_LTE, structTehn[ratScan].timestamp, structTehn[ratScan].tags);
                dataResponse = {
                    "LTE": responeElastic.hits.hits
                }
                break;
            default:
                let dataGSM = await getElasticDataWithTag(ES.INDEX_GSM, structTehn["GSM"].timestamp, structTehn["GSM"].tags);
                let dataUMTS = await getElasticDataWithTag(ES.INDEX_UMTS, structTehn["UMTS"].timestamp, structTehn["UMTS"].tags);
                let dataLTE = await getElasticDataWithTag(ES.INDEX_LTE, structTehn["LTE"].timestamp, structTehn["LTE"].tags);
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
        let lastDate = lastDateBucket.hits.hits[0]?._source["timestampPrimit"] || "2022-10-25T13:05:03.611Z";

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