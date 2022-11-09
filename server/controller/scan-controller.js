const { getAllRecomand } = require("../../Tehn/allTehn");
const { getLastDateElastic, getElasticData, getTagTimestamp, getElasticDataWithTag } = require("../../database/elastic");
const { ES, errorLogFile, logFile } = require('../../conf.json');
const { insertLog } = require('../../Logs/formatLogs');

const getScanData = async (req, res, next) => {
    const ratScan = req.params.scanTehn;
    let { gsmCatch, umtsCatch, lteCatch } = req.body;
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
                    "GSM": filterCatchActive(responeElastic.hits.hits, gsmCatch ?? [])
                }
                break;
            case "UMTS":
                responeElastic = await getElasticDataWithTag(ES.INDEX_UMTS, structTehn[ratScan].timestamp, structTehn[ratScan].tags);
                dataResponse = {
                    "UMTS": filterCatchActive(responeElastic.hits.hits, umtsCatch ?? [])
                }
                break;
            case "LTE":
                responeElastic = await getElasticDataWithTag(ES.INDEX_LTE, structTehn[ratScan].timestamp, structTehn[ratScan].tags);
                dataResponse = {
                    "LTE": filterCatchActive(responeElastic.hits.hits, lteCatch ?? [])
                }
                break;
            default:
                let dataGSM = await getElasticDataWithTag(ES.INDEX_GSM, structTehn["GSM"].timestamp, structTehn["GSM"].tags);
                let dataUMTS = await getElasticDataWithTag(ES.INDEX_UMTS, structTehn["UMTS"].timestamp, structTehn["UMTS"].tags);
                let dataLTE = await getElasticDataWithTag(ES.INDEX_LTE, structTehn["LTE"].timestamp, structTehn["LTE"].tags);
                dataResponse = {
                    "GSM": filterCatchActive(dataGSM.hits.hits),
                    "UMTS": filterCatchActive(dataUMTS.hits.hits),
                    "LTE": filterCatchActive(dataLTE.hits.hits)
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
    let filterElastic = [];
    let { gsmCatch, umtsCatch, lteCatch } = req.body;

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
                filterElastic = filterCatchActive(bucketElastic.hits.hits, gsmCatch);
                sourceRecomand = getAllRecomand(filterElastic);
                break;
            case "UMTS":
                bucketElastic = await getElasticData(ES.INDEX_UMTS, lastDate);
                filterElastic = filterCatchActive(bucketElastic.hits.hits, umtsCatch);

                sourceRecomand = getAllRecomand([], filterElastic, []);
                break;
            case "LTE":
                bucketElastic = await getElasticData(ES.INDEX_LTE, lastDate);
                filterElastic = filterCatchActive(bucketElastic.hits.hits, lteCatch);

                sourceRecomand = getAllRecomand([], [], filterElastic);
                break;
            default:
                let dataGSM = await getElasticData(ES.INDEX_GSM, lastDate);
                let dataUMTS = await getElasticData(ES.INDEX_UMTS, lastDate);
                let dataLTE = await getElasticData(ES.INDEX_LTE, lastDate);
                let dataGSMFiltered = filterCatchActive(dataGSM.hits.hits, gsmCatch);
                let dataUMTSFiltered = filterCatchActive(dataUMTS.hits.hits, umtsCatch);
                let dataLTEFiltered = filterCatchActive(dataLTE.hits.hits, lteCatch);
                sourceRecomand = getAllRecomand(dataGSMFiltered, dataUMTSFiltered, dataLTEFiltered);
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

const filterCatchActive = (data = [], catchList = []) => {
    try {
        if (!catchList.length) return data;
        return data.filter((cellObj) => {
            if (cellObj._index.includes('2g')) {
                if (!catchList.includes(cellObj._source.system_info.cell_id))
                    return cellObj;
            } else if (cellObj._index.includes('3g')) {
                if (!catchList.includes(cellObj._source.system_info[0].network_cell_id))
                    return cellObj;
            } else if (cellObj._index.includes('4g')) {
                if (!catchList.includes(cellObj._source.system_info.sib1.l3cell_id))
                    return cellObj;
            }
            return cellObj;
        });

    } catch (error) {
        console.error(error);
        insertLog(error, errorLogFile);
        return data;
    }
}

module.exports = {
    getScanData,
    getNetworkEnv
}