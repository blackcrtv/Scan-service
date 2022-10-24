const { Client: Client7 } = require('es7')
const config = require('./conf.json')


let url = config.ES.IP;

/**
 *  Utilizat pentru import in Elasticsearch
 * @param indexul in care se doreste a se importa datele _index 
 * @param datele de importat _data 
 */
const insertElastic = async (_index, _data) => {
    try {
        const client = new Client7({ node: url })

        return await client.index({
            index: _index,
            body: _data
        });
    } catch (error) {
        console.log(error)
        return false;
    }

}
module.exports.insertElastic = insertElastic;

const searchElastic = async (search, index_dest) => {
    try {
        const client = new Client7({ node: url })
        let { body } = await client.search({
            index: index_dest,
            body: search
        })
        console.log(body)
        return body;
    } catch (error) {
        console.log(error)
        return false;
    }

}
module.exports.searchElastic = searchElastic;