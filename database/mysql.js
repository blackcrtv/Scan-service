const mysql = require('mysql');
const { MYSQL } = require('../conf.json')

const setConnection = async (settings = MYSQL) => {
    let con = mysql.createConnection(settings);

    return new Promise((resolve, reject) => {
        con.connect((err) => {
            if (err) {
                return reject({ connDB: false, error: err });
            }
            console.log('Db is open...');
            return resolve({ connDB: con, error: false })
        });

    })
}
module.exports.setConnection = setConnection;

const sendQuery = async (con, query) => {
    return new Promise((resolve,reject)=>{
        con.query(query, function (err, result) {
            if (err){
                console.log(err);
                return reject(null);
            } 
            return resolve(result);
        });
    })
}
module.exports.sendQuery = sendQuery;

/**
 *Se verifica conexiunea la baza de date si se executa selectul pentru starea receptorului
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
module.exports.checkDB = checkDB;