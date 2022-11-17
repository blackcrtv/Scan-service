const { getRecomandare2G } = require('./GSM');
const { getRecomandare3G } = require('./UMTS');
const { getRecomandare4G } = require('./LTE');
const {
    mcc_src,
    mnc_src,
    bands_2G,
    bands_3G,
    bands_4G
} = require('./src');

const maskCellid = (val) => {
    let t = (val & 0xffff).toString();
    return parseInt(t);
}


const getAllRecomand = (dataGSM = [], dataUMTS = [], dataLTE = []) => {
    let GSM = (dataGSM.length ? getRecomandare2G(dataGSM) : {});
    let UMTS = (dataUMTS.length ? getRecomandare3G(dataUMTS) : {});
    let LTE = (dataLTE.length ? getRecomandare4G(dataLTE) : {});
    let structura_obj = {
        provider: 'mnc text + ctry',
        tehnologie: 'GSM UMTS LTE',
        band_str: '2G900 3G2100',
        mnc: 'cod',
        mcc: 'cod',
        serv_ch: 'detalii serv',
        serv_cell: 'nimic la 3g si 4g momentan',
        serv_rssi: 'power',
        rec_ch: 'canal',
        rec_cell: 'celula',
        rec_rssi: 'rssi',
        _id: 'id elastic',
        obj_catch: 'rest obiect pentru catch',
        timestamp: 'datetime',
        key: 'mnc-mcc-tehn-canal',
        elasticID: 'key + pci/pcs/null'
    }

    let sourceTab = [];

    for (const key in GSM) {
        if (!GSM[key]) continue;

        try {
            structura_obj = {}
            structura_obj.provider = `${mnc_src[GSM[key].cell_info.mcc]?.[GSM[key].cell_info.mnc]} (${mcc_src[GSM[key].cell_info.mcc]?.ctry})`;
            structura_obj.tehnologie = 'GSM';
            structura_obj.mnc = GSM[key].cell_info.mnc;
            structura_obj.mcc = GSM[key].cell_info.mcc;
            structura_obj.serv_ch = GSM[key].serving.canal;
            structura_obj.serv_cell = GSM[key].serving.cell_id
            structura_obj.serv_rssi = GSM[key].serving.putere;
            structura_obj.rec_ch = GSM[key].canal;
            structura_obj.rec_cell = GSM[key].cell_info.cell_id;
            structura_obj.rec_rssi = GSM[key].rssi;
            structura_obj.id = GSM[key].cell_info._id;
            structura_obj.obj_catch = { ...GSM[key].cell_info, scor: GSM[key].scor, aparitii: GSM[key].aparitii }
            structura_obj.timestamp = GSM[key].cell_info.timestamp;
            structura_obj.band_str = bands_2G[GSM[key].cell_info.band];
            structura_obj.key = `${GSM[key].cell_info.mcc}-${GSM[key].cell_info.mnc}-GSM-${GSM[key].canal}`;
            structura_obj.elasticID = `${GSM[key].cell_info.mcc}-${GSM[key].cell_info.mnc}-GSM-${GSM[key].canal}`;

            sourceTab.push(structura_obj)
        } catch (error) {
            console.log("eroare gsm");
            console.log(error)
            continue;
        }
    }
    for (const key in UMTS) {
        if (!UMTS[key]) continue;
        try {
            structura_obj = {}
            structura_obj.provider = `${mnc_src[UMTS[key].cell_info.mcc]?.[UMTS[key].cell_info.mnc]} (${mcc_src[UMTS[key].cell_info.mcc]?.ctry})`;
            structura_obj.tehnologie = 'UMTS';
            structura_obj.mcc = UMTS[key].cell_info.mcc;
            structura_obj.mnc = UMTS[key].cell_info.mnc;
            structura_obj.serv_ch = `${UMTS[key].serving.uarfcn}-${UMTS[key].serving.psc}`;
            structura_obj.serv_cell = maskCellid(UMTS[key].serving.cell_id) ?? 'NULL';
            structura_obj.serv_rssi = UMTS[key].serving.rscp ?? 'NULL';
            structura_obj.rec_ch = `${UMTS[key].cell_info.uarfcn}-${UMTS[key].scor[0].psc}`;
            structura_obj.rec_cell = maskCellid(UMTS[key].cell_info.cell_id);
            structura_obj.rec_rssi = UMTS[key].cell_info.rscp;
            structura_obj.id = UMTS[key].cell_info.id ?? 0;
            structura_obj.obj_catch = { ...UMTS[key].cell_info, ch: UMTS[key].cell_info.uarfcn, scor: [...UMTS[key].scor] }
            structura_obj.timestamp = UMTS[key].cell_info.timestamp;
            structura_obj.band_str = bands_3G[UMTS[key].cell_info.band];
            structura_obj.key = `${UMTS[key].cell_info.mcc}-${UMTS[key].cell_info.mnc}-UMTS-${UMTS[key].serving.uarfcn}`;
            structura_obj.elasticID = `${UMTS[key].cell_info.mcc}-${UMTS[key].cell_info.mnc}-UMTS-${UMTS[key].serving.uarfcn}}`;

            sourceTab.push(structura_obj)

        } catch (error) {
            console.log(UMTS[key])
            console.log("eroare umts");
            console.log(error)
            continue;
        }
    }
    for (const key in LTE) {
        if (!LTE[key]) continue;

        try {
            structura_obj = {}
            structura_obj.provider = `${mnc_src[LTE[key].serving_cell.mcc]?.[LTE[key].serving_cell.mnc]} (${mcc_src[LTE[key].serving_cell.mcc]?.ctry})`;
            structura_obj.tehnologie = 'LTE';
            structura_obj.mnc = LTE[key].serving_cell.mnc;
            structura_obj.mcc = LTE[key].serving_cell.mcc;
            structura_obj.serv_ch = `${LTE[key].serving_cell.earfcn}-${LTE[key].serving_cell.pci}`;
            structura_obj.serv_cell = LTE[key].serving_cell.l3cellid ?? '/';
            structura_obj.serv_rssi = LTE[key].serving_cell.rssi ?? '/';
            structura_obj.rec_ch = `${LTE[key].recomandare.earfcn}-${LTE[key].recomandare.scor_grupat[LTE[key].recomandare.ord_pci[0]][0].pci}`;
            structura_obj.rec_cell = LTE[key].recomandare.l3cellid;
            structura_obj.rec_rssi = LTE[key].recomandare.rssi ?? 0;
            structura_obj.id = LTE[key].serving_cell.id ?? 0;
            structura_obj.obj_catch = { ...LTE[key].serving_cell, ...LTE[key].recomandare }
            structura_obj.timestamp = LTE[key].serving_cell.timestamp;
            structura_obj.band_str = bands_4G[LTE[key].serving_cell.band];
            structura_obj.key = `${LTE[key].serving_cell.mcc}-${LTE[key].serving_cell.mnc}-LTE-${LTE[key].serving_cell.earfcn}`;
            structura_obj.elasticID = `${LTE[key].serving_cell.mcc}-${LTE[key].serving_cell.mnc}-LTE-${LTE[key].serving_cell.earfcn}`;

            sourceTab.push(structura_obj)

        } catch (error) {
            console.log("eroare lte");
            console.log(error)
            continue;
        }
    }
    return sourceTab;
}

module.exports = {
    getRecomandare2G,
    getRecomandare3G,
    getRecomandare4G,
    getAllRecomand
}