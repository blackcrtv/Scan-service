const { insertLog } = require('./Logs/Script/formatLogs');
const bodyParser = require('body-parser');
const scanRoute = require('./server/routes/scan-route');
const { errorLogFile, logFile, EXPRESS_PORT } = require('./conf.json');

const express = require('express')

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

    next();
});

app.use('/api', scanRoute);

app.use((error, req, res, next) => {
    if (res.headerSent) {
        return next(error);
    }
    res.status(error.code || 500)
    res.json({ message: error.message || 'An unknown error occurred!' });
    insertLog(error, errorLogFile);
});

app.listen(EXPRESS_PORT, () => {
    insertLog(`Listening at ${EXPRESS_PORT}`, logFile);
});

