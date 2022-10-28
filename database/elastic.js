const { Client: Client7 } = require('es7')
const { ES } = require('../conf.json')


/**
 *  Utilizat pentru import in Elasticsearch
 * @param indexul in care se doreste a se importa datele _index 
 * @param datele de importat _data 
 */
const insertElastic = async (_index, _data) => {
    try {
        const client = new Client7({ node: ES.IP })

        return await client.index({
            index: _index,
            body: _data
        });
    } catch (error) {
        console.log(error)
        return {
            err: true,
            errMsg: error,
            data: _data
        };
    }

}
module.exports.insertElastic = insertElastic;

const searchElastic = async (search, index_dest) => {
    try {
        const client = new Client7({ node: ES.IP })
        let { body } = await client.search({
            index: index_dest,
            body: search
        })
        // console.log(body)
        return body;
    } catch (error) {
        console.log(error)
        return null;
    }

}
module.exports.searchElastic = searchElastic;

/**
 * Inserare in elastic cu _id configurat ce trebuie sa se regaseasca in obiect
 * @param {string} _index 
 * @param {object} _data format query elastic
 * @returns 
 */
const insertElasticWithId = async (_index, _data) => {
    try {
        const client = new Client7({ node: ES.IP })

        return await client.index({
            id: _data.key,
            index: _index,
            body: _data
        });
    } catch (error) {
        console.log(error)
        return {
            err: true,
            errMsg: error,
            data: _data
        };
    }

}
module.exports.insertElasticWithId = insertElasticWithId;

const getLastDateElastic = async (index = ES.INDEX_ALL_SCAN) => {
    try {
        let queryBody = {
            query: {
                match_all: {},
            },
            size: 1,
            sort: [
                {
                    "timestampPrimit": { order: "desc" }
                }
            ]
        };

        return await searchElastic(queryBody, index);

    } catch (error) {
        console.log(error);
        return [];
    }
};
module.exports.getLastDateElastic = getLastDateElastic;

/**
 * 
 * @param {string} index default conf.ES.INDEX_GSM
 * @param {string} date grater or equal than this date
 * @returns bucket format hits.hits
 */
 const getElasticData = async (index = ES.INDEX_GSM, date = "2022-10-25T13:05:03.611Z") => {
    try {
        let queryBody = {
            query: {
                bool: {
                    must: [
                        {
                            range: {
                                "timestampPrimit": {
                                    gte: date + "||-3m",
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
        insertLog(error, errorLogFile);
        return false;
    }
};
module.exports.getElasticData = getElasticData;