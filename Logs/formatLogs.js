const fs = require('fs');

const getCurrentTime = () => {
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = ("0" + (date_ob.getHours())).slice(-2);
    let minutes =("0" + (date_ob.getMinutes())).slice(-2);
    let seconds = ("0" + (date_ob.getSeconds())).slice(-2);

    return {
        dateShort: year + "-" + month + "-" + date,
        dateLong: year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds,
        time: hours + ":" + minutes + ":" + seconds
    }
}

const insertLog = (message, file) => {
    let errStr = '';
    let { time, dateShort } = getCurrentTime();
    if (typeof message === 'object') {
        errStr = JSON.stringify(message);
    } else {
        errStr = message.toString();
    }
    fs.appendFile(file.replace('.txt', `${dateShort}.txt`), `${time}: ${errStr} \n`, function (err) {
        if (err) return console.log('Nu se poate scrie in fisier \n');
    });
}

module.exports = {
    insertLog
}