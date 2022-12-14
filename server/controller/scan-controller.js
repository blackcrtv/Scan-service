const { getAllRecomand } = require("../../Tehn/allTehn");
const { getLastDateElastic, getTagTimestamp, getElasticDataWithTag, buildQuery, deleteElastic } = require("../../database/elastic");
const { ES, errorLogFile, logFile } = require('../../conf.json');
const { insertLog, insertRecomandare } = require('../../Logs/Script/formatLogs');

let cacheData = require('../../local/cacheData');
cacheData.getData();

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
                [ES.INDEX_GSM]: "GSM",
                [ES.INDEX_UMTS]: "UMTS",
                [ES.INDEX_LTE]: "LTE"
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
        let dataResponse, responseElastic;

        switch (ratScan) {
            case "GSM":
                responseElastic = await getElasticDataWithTag(ES.INDEX_GSM, structTehn[ratScan].timestamp, structTehn[ratScan].tags);
                dataResponse = {
                    "GSM": filterCatchActive(responseElastic.hits.hits, gsmCatch)
                }
                break;
            case "UMTS":
                responseElastic = await getElasticDataWithTag(ES.INDEX_UMTS, structTehn[ratScan].timestamp, structTehn[ratScan].tags);
                dataResponse = {
                    "UMTS": filterCatchActive(responseElastic.hits.hits, umtsCatch ?? [])
                }
                break;
            case "LTE":
                responseElastic = await getElasticDataWithTag(ES.INDEX_LTE, structTehn[ratScan].timestamp, structTehn[ratScan].tags);
                dataResponse = {
                    "LTE": filterCatchActive(responseElastic.hits.hits, lteCatch ?? [])
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
    let { gsmCatch, umtsCatch, lteCatch, lockedChannels } = req.body;
    // let DUMMY_GSM = DUMMY.filter(cell => cell._index === "index_scan_beta_2g")
    // let DUMMY_UMTS = DUMMY.filter(cell => cell._index === "index_scan_beta_3g")
    // let DUMMY_LTE = DUMMY.filter(cell => cell._index === "index_scan_beta_4g")
    try {
        let lastDateBucket = await getLastDateElastic();
        if (!lastDateBucket) {
            throw new Error('Eroare select timestamp din elasticsearch')
        }
        let aggData = await getTagTimestamp();
        if (!aggData) {
            throw new Error('Eroare select timestamp/tag din elasticsearch')
        }

        let structTehn = aggData.tehn.buckets?.reduce((acc, curr) => {
            let mapper = {
                [ES.INDEX_GSM]: "GSM",
                [ES.INDEX_UMTS]: "UMTS",
                [ES.INDEX_LTE]: "LTE"
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

        switch (recTehn) {
            case "GSM":
                bucketElastic = await getElasticDataWithTag(ES.INDEX_GSM, structTehn[recTehn].timestamp, structTehn[recTehn].tags);
                filterElastic = filterCatchActive(bucketElastic.hits.hits, gsmCatch);
                sourceRecomand = getAllRecomand(filterElastic);
                break;
            case "UMTS":
                bucketElastic = await getElasticDataWithTag(ES.INDEX_UMTS, structTehn[recTehn].timestamp, structTehn[recTehn].tags);
                filterElastic = filterCatchActive(bucketElastic.hits.hits, umtsCatch ?? []);
                sourceRecomand = getAllRecomand([], filterElastic, []);
                break;
            case "LTE":
                bucketElastic = await getElasticDataWithTag(ES.INDEX_LTE, structTehn[recTehn].timestamp, structTehn[recTehn].tags);
                filterElastic = filterCatchActive(bucketElastic.hits.hits, lteCatch ?? []);

                sourceRecomand = getAllRecomand([], [], filterElastic);
                break;
            default:
                let dataGSM = await getElasticDataWithTag(ES.INDEX_GSM, structTehn["GSM"].timestamp, structTehn["GSM"].tags);
                let dataUMTS = await getElasticDataWithTag(ES.INDEX_UMTS, structTehn["UMTS"].timestamp, structTehn["UMTS"].tags);
                let dataLTE = await getElasticDataWithTag(ES.INDEX_LTE, structTehn["LTE"].timestamp, structTehn["LTE"].tags);
                let dataGSMFiltered = filterCatchActive(dataGSM.hits.hits, gsmCatch ?? []);
                let dataUMTSFiltered = filterCatchActive(dataUMTS.hits.hits, umtsCatch ?? []);
                let dataLTEFiltered = filterCatchActive(dataLTE.hits.hits, lteCatch ?? []);
                sourceRecomand = getAllRecomand(dataGSMFiltered, dataUMTSFiltered, dataLTEFiltered);
                // sourceRecomand = getAllRecomand(DUMMY_GSM, DUMMY_UMTS, DUMMY_LTE);
                break;
        }
        cacheData.setLockedCells(lockedChannels ?? []);
        cacheData.setData(sourceRecomand, lockedChannels ?? []);
        res.json({
            "networkEnv": [...cacheData.recomandare, ...cacheData.lockedRec],
            "locked": cacheData.lockedRec,
            "iteratii": cacheData.iteratii
        })
    } catch (error) {
        console.log(error)
        insertLog(error, errorLogFile);
        res.json({
            "networkEnv": [],
            error
        })
    }
}

const getNetworkEnvTesting = async (req, res, next) => {
    const recTehn = req.params.recTehn;
    let sourceRecomand = [];
    let { gsmCatch, umtsCatch, lteCatch, lockedChannels } = req.body;
    try {
        let DUMMY = require('../../dummy.json')
        let DUMMY_GSM = DUMMY.filter(cell => cell._index === "index_scan_beta_2g")
        let DUMMY_UMTS = DUMMY.filter(cell => cell._index === "index_scan_beta_3g")
        let DUMMY_LTE = DUMMY.filter(cell => cell._index === "index_scan_beta_4g")

        switch (recTehn) {
            case "GSM":
                sourceRecomand = getAllRecomand(DUMMY_GSM);
                break;
            case "UMTS":
                sourceRecomand = getAllRecomand([], DUMMY_UMTS, []);
                break;
            case "LTE":

                sourceRecomand = getAllRecomand([], [], DUMMY_LTE);
                break;
            default:
                sourceRecomand = getAllRecomand(DUMMY_GSM, DUMMY_UMTS, DUMMY_LTE);
                break;
        }
        cacheData.setLockedCells(lockedChannels ?? []);
        cacheData.setData(sourceRecomand, lockedChannels ?? []);
        res.json({
            "networkEnv": [...cacheData.recomandare, ...cacheData.lockedRec],
            "locked": cacheData.lockedRec,
            "iteratii": cacheData.iteratii
        })
    } catch (error) {
        console.log(error)
        insertLog(error, errorLogFile);
        res.json({
            "networkEnv": [],
            error
        })
    }
}

const filterCatchActive = (data = [], catchList = []) => {
    try {
        if (!catchList.length) {
            return data;
        }
        catchList = catchList.map(el => parseInt(el));
        // console.log(catchList)
        return data.filter((cellObj) => {
            if (cellObj._index.includes('2g')) {
                if (!catchList.includes(cellObj._source.system_info.cell_id))
                    return cellObj;
            } else if (cellObj._index.includes('3g')) {
                if (!catchList.includes(cellObj._source.system_info.cell_info[0].network_cell_id)) {
                    return cellObj;
                }
            } else if (cellObj._index.includes('4g')) {
                if (!catchList.includes(cellObj._source.system_info.sib1.l3cell_id))
                    return cellObj;
            } else
                return cellObj;
        });

    } catch (error) {
        console.error(error);
        insertLog(error, errorLogFile);
        return data;
    }
}

const deleteScanCellid = async (req, res, next) => {
    let { gsmCatch, umtsCatch, lteCatch } = req.body;
    try {
        let queryGSM = buildQuery([
            {
                type: "terms",
                field: "system_info.cell_id",
                values: [...gsmCatch]
            }
        ]);
        let queryUMTS = buildQuery([
            {
                type: "terms",
                field: "system_info.cell_info.network_cell_id",
                values: [...umtsCatch]
            }, {
                type: "range",
                field: "@timestamp",
                values: {
                    "gte": "now-1h"
                }
            }
        ]);
        let queryLTE = buildQuery([
            {
                type: "terms",
                field: "system_info.sib1.l3cell_id",
                values: [...lteCatch]
            }
        ]);

        let resultGSM = await deleteElastic(queryGSM, ES.INDEX_GSM);
        let resultUMTS = await deleteElastic(queryUMTS, ES.INDEX_UMTS);
        let resultLTE = await deleteElastic(queryLTE, ES.INDEX_LTE);

        res.json({
            resultGSM,
            resultUMTS,
            resultLTE
        });
    } catch (error) {
        insertLog(error, errorLogFile);
        res.json({
            "error": error
        });
    }
}

const resetIteratii = async (req, res, next) => {
    try {
        cacheData.resetIteratii();
        res.json({
            "result": true
        });
    } catch (error) {
        insertLog(error, errorLogFile);
        res.json({
            "error": error
        });
    }
}

module.exports = {
    getScanData,
    getNetworkEnv,
    deleteScanCellid,
    resetIteratii,
    getNetworkEnvTesting
}