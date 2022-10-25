const mysql = require('mysql');
const { MYSQL } = require('../conf.json')

const setConnection = async (settings = MYSQL) => {
    let con = mysql.createConnection(settings);

    return new Promise((resolve, reject) => {
        con.connect((err) => {
            if (err) {
                return reject({ connDB: false, error: err });
            }
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
