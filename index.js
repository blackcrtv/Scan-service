const { getAllRecomand } = require("./Tehn/allTehn");
const { setConnection, sendQuery } = require("./database/mysql");
const { searchElastic, insertElastic } = require("./database/elastic");
const { ES, errorLogFile, logFile, INTERVAL_SERVICE } = require('./conf.json');
const fs = require('fs');

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
        console.log('Db is open...')
        let cmdState = await sendQuery(
            connDB,
            "SELECT command_type, status from catbox.commandrec order by id desc limit 1"
        );

        if (!cmdState) {
            return false;
        }
        connDB.end(function (err) {
            if (err) {
                return console.log('error:' + err.message);
            }
            console.log('Close the database connection.');
        });
        return cmdState;
    } catch (error) {
        console.log("Eroare"); //de gestionat eroare de conexiune cand minipc este inchis
        return false;
    }
};

const getElasticData = async (index = ES.INDEX_GSM, date = "2022-10-25T13:05:03.611Z") => {
    try {
        let queryBody = {
            query: {
                bool: {
                    must: [
                        {
                            range: {
                                "@timestamp": {
                                    gte: date + "||-1h",
                                    lte: date
                                }
                            }
                        }
                    ]
                }
            }
        };
        return await searchElastic(queryBody, index);
    } catch (error) {
        console.log(error)
        return false;
    }
};

const getLastDateElastic = async (index = ES.INDEX_ALL_SCAN) => {
    try {
        let queryBody = {
            query: {
                match_all: {},
            },
            size: 1,
            sort: [
                {
                    "@timestamp": { order: "desc" }
                }
            ]
        };

        return await searchElastic(queryBody, index);

    } catch (error) {
        console.log(error);
        return [];
    }
};

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
                return await insertElastic(ES.INDEX_RECOMANDARI, data)
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
        let errStr = '';
        if (typeof error === 'object') {
            errStr = JSON.stringify(error);
        } else {
            error = error.toString();
        }
        fs.appendFile(errorLogFile, error.toString() + "\n", function (err) {
            if (err) return console.log('Nu se poate scrie in fisier \n');
        });
        throw error;
    }
}

let intervalMain = setInterval(async () => {

    try {
        let resultStatus = await main();
        fs.appendFile(logFile, JSON.stringify(resultStatus) + "\n", function (err) {
            if (err) return console.log('Nu se poate scrie in fisier \n');
        });
    } catch (error) {
        console.log(error);
    }
}, INTERVAL_SERVICE);

// main().then(resultStatus => {
//     console.log(resultStatus);
// }).catch((msg) => {
//     console.log('Eroare ');
//     console.log(msg)
// })