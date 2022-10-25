const { getRecomandare2G, getRecomandare3G, getRecomandare4G } = require('./Tehn/allTehn');
const { setConnection, sendQuery } = require('./database/mysql');
const { searchElastic, insertElastic} = require('./database/elastic');

const dummyData = require('./dummy.json');

// let data = getRecomandare2G(dummyData);
// let data = getRecomandare4G(dummyData);
// console.log(data)


/**
 * 
 * @returns Array[{ command_type:"", status: int }]
 */
const checkDB = async () => {
    try {
        let { connDB, error: errorDB } = await setConnection();
        if (errorDB) {
            return false;
        }
        let cmdState = await sendQuery(connDB, "SELECT command_type, status from catbox.commandrec order by id desc limit 1");

        if (!cmdState) {
            return false;
        }
        return cmdState;
    } catch (error) {
        console.log('Eroare'); //de gestionat eroare de conexiune cand minipc este inchis
    }
}

const getElasticData = async () => {
    let queryBody = {
        "query": {
            "bool": {
                "must": [
                    {
                        "range": {
                            "@timestamp": {
                                "gt": "2022-10-25T13:05:03.611Z||-1h",
                                "lt": "2022-10-25T13:05:03.611Z"
                            }
                        }
                    }
                ]
            }
        }
    }
    return await searchElastic(queryBody, "index_scan_2g_beta");
}

getElasticData().then(console.log)


