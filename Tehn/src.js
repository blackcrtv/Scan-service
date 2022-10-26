const { RECOMANDARI } = require('../conf.json')

const mcc_src = {
    '226': {
        ctry: 'Romania',
        code: ['01', '02', '03', '04', '05', '06', '10', '11', '15', '16', '19']
    },
    '259': {
        ctry: 'Moldova',
        code: ['04', '05', '03', '99', '02', '01']
    },
    '255': {
        ctry: 'Ucraina',
        code: ['04', '67', '03', '02', '68', '01', '50', '05', '39', '06', '07']
    },
    '216': {
        ctry: 'Ungaria',
        code: ['03', '999', '01', '30', '30', '71', '70']
    },
    '220': {
        ctry: 'Serbia',
        code: ['03', '02', '01', '05']
    },
    '284': {
        ctry: 'Bulgaria',
        code: ['06', '03', '01', '05']
    }
}
const mnc_src = {
    '226': {
        '01': 'Vodafone',
        //'02': 'Clicknet Mobile',
        '03': 'Telekom',
        '04': 'Telekom',
        '05': 'Digi',
        '06': 'Telekom',
        '10': 'Orange',
        '11': 'Enigma-System',
        '15': 'Idilis',
        '16': 'Lycamobile',
        '19': 'CFR'
    },
    '255': {
        '06': 'Astelit/LIFE',
        '05': 'Golden Telecom',
        '39': 'Golden Telecom',
        '04': 'Intertelecom Ltd',
        '67': 'KyivStar',
        '03': 'KyivStar',
        '99': 'Phoenix',
        '21': 'Telesystems Of Ukraine CJSC',
        '07': 'TriMob',
        '50': 'Vodafone/MTS',
        '02': 'Beeline',
        '01': 'Vodafone/MTS',
        '68': 'Beeline'
    },
    '259': {
        '04': 'Eventis Mobile',
        '05': 'IDC/Unite',
        '03': 'IDC/Unite',
        '99': 'IDC/Unite',
        '02': 'MoldCell',
        '01': 'Orange/Voxtel'
    },
    '216': {
        '03': 'DIGI',
        '999': 'Fix line',
        '30': 'T-mobile/Magyar',
        '71': 'UPC Magyarorszag Kft.',
        '70': 'Vodafone'
    },
    '220': {
        '03': 'MTS/Telekom Srbija',
        '02': 'Telenor/Mobtel',
        '01': 'Telenor/Mobtel',
        '05': 'VIP Mobile'
    },
    '284': {
        '06': 'BTC Mobile EOOD (vivatel)',
        '03': 'BTC Mobile EOOD (vivatel)',
        '05': 'Telenor/Cosmo/Globul',
        '01': 'MobilTel AD'
    }
}
const bands_2G = {
    '10': '2G900',
    '13': '2G1800'
}
const bands_3G = {
    '1': '3G900',
    '8': '3G2100'
}
const bands_4G = {
    '1': '4G800',
    '3': '4G900',
    '7': '4G1800',
    '8': '4G2100',
    '20': '4G2600',
    '38': '4G2600 TDD'
}

const groupBy = (xs, key, opt = '') => {
    return xs.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(opt ? x[opt] : x);
        return rv;
    }, {});
};

const uniqueFromArray = (a = []) => {
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};

const incrCellInfo = (list = [], opt = 'lac') => {
    N = RECOMANDARI.N;
    if (opt === 'lac' || opt === 'tac') {
        let lac_list = list;
        let max = Math.pow(2, 16);
        let new_lac = Math.floor(Math.random() * (max - 1));
        while (lac_list.includes(new_lac)) {
            new_lac = (new_lac + N) % max;
        }
        return {
            new_lac,
            lac_list
        };
    }
    if (opt === 'cell_id') {
        let cell_list = list;
        let max = Math.pow(2, 16) - N;
        let rnd_cell = Math.floor(Math.random() * (max - 1)) + N;
        while (cell_list.includes(rnd_cell)) {
            rnd_cell = rnd_cell + N;
        }
        return rnd_cell;
    }

    if (opt === 'l3cell_id') {
        let l3cell_list = list;
        let max = Math.pow(2, 28) - N;
        let rnd_cell = Math.floor(Math.random() * (max - 1));
        while (l3cell_list.includes(rnd_cell)) {
            rnd_cell = Math.floor(Math.random() * (max - 1));
        }
        return rnd_cell;
    }
}

module.exports = {
    groupBy,
    uniqueFromArray,
    incrCellInfo,
    mcc_src,
    mnc_src,
    bands_2G,
    bands_3G,
    bands_4G
}