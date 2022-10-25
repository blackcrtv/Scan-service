const { getAllRecomand } = require("./Tehn/allTehn");
const { setConnection, sendQuery } = require("./database/mysql");
const { searchElastic, insertElastic } = require("./database/elastic");
const { ES } = require('./conf.json');

// const dummyData = require("./dummy.json");

// let data = getRecomandare2G(dummyData);
// let data = getRecomandare4G(dummyData);


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
    let cmdState = await sendQuery(
      connDB,
      "SELECT command_type, status from catbox.commandrec order by id desc limit 1"
    );

    if (!cmdState) {
      return false;
    }
    return cmdState;
  } catch (error) {
    console.log("Eroare"); //de gestionat eroare de conexiune cand minipc este inchis
    return false;
  }
};

const getElasticData = async (index = ES.INDEX_GSM, date ="2022-10-25T13:05:03.611Z") => {
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
                "@timestamp": { order: "asc", format: "strict_date_optional_time_nanos" }
            }
          ]
        };
      
        return await searchElastic(queryBody, index);
        
    } catch (error) {
        console.log(error);
        return false;
    }
};

const main = async()=>{
    try {
        //1.Check DB

        let flagDB = await checkDB();
        if(!flagDB){
            return {
                error:true,
                msg: 'Eroare conexiune DB',
                errorStatus: 1
            }
        }
        if(flagDB.length === 0){
            return {
                error: true,
                msg: 'Nu exista status receptor',
                errorStatus: 2
            }
        }
        if(!(flagDB[0].status == 2 && flagDB[0].command_type == 'SCAN')){
            return {
                error: false,
                msg: 'Receptorul nu se afla in scan activ',
                errorStatus: -1
            }
        }
        
        //2. Obtinem datele din elastic, prima data luam ultima data inregistrata pe care o folosim in urmatorul query in date range

        let lastDateBucket = await getLastDateElastic();
        if(!lastDateBucket){
            return {
                error: true,
                msg: 'Eroare select timestamp din elasticsearch',
                errorStatus: 4
            }
        }
        let lastDate = lastDateBucket.hits.hits[0]?._source["@timestamp"];

        let dataGSM = await getElasticData(ES.INDEX_GSM, lastDate);
        let dataUMTS = await getElasticData(ES.INDEX_UMTS, lastDate);
        let dataLTE = await getElasticData(ES.INDEX_LTE, lastDate);

        //3. Pentru fiecare tehnologie vom obtine recomandarile
        let sourceRecomand = getAllRecomand(dataGSM, dataUMTS, dataLTE);
        //4. Inserare in ES cu update sau insert
    } catch (error) {
        return {
            error:true,
            msg: 'Eroare main: ' + error,
            errorStatus: 0
        }
    }
}

