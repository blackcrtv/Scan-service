const { uniqueFromArray, groupBy, incrCellInfo } = require("./src");
const channels = require("./channels.json");
const { RECOMANDARI } = require('../conf.json');

const formatData = (table = [], channels) => {
  if (!table.length)
    return {
      vecini: null,
      serv: null,
    };
  ch_group = { [RECOMANDARI.bandMapare["2G900"]]: channels["2G900"].channels, [RECOMANDARI.bandMapare["2G1800"]]: channels["2G1800"].channels };

  // gasire serving
  let servings = {}; // putere, canal, vecini, key = operator

  let filteredData = table.map((el, i) => {
    let to_work = el._source;
    let vecini_filt = to_work.system_info.arfcn_neighbors;
    let band = to_work.system_info.band;
    let ctry_indicator = to_work.system_info.plmn?.mnc_length || 2;
    let mnc =
      to_work.system_info.plmn?.mnc?.join("").slice(0, ctry_indicator) ??
      to_work.system_info.mnc?.join("").slice(0, 2);
    let mcc =
      to_work.system_info.plmn?.mcc?.join("").slice(0, 3) ??
      to_work.system_info.mcc?.join("").slice(0, 3);

    vecini_filt = vecini_filt.filter((canal) => {
      // lasam doar canalele din fiecare tehnologie
      if (ch_group[`${band}`]?.includes(canal)) return canal;
    });
    return {
      operator: `${mcc}-${mnc}-${to_work.system_info.band}`,
      uniqueCh: to_work.system_info.arfcn,
      params: {
        putere: to_work.system_info.rssi,
        canal: to_work.system_info.arfcn,
        band: to_work.system_info.band,
        vecini: vecini_filt,
        cell_id: to_work.system_info.cell_id,
        lac: to_work.system_info.lac,
        ncc: to_work.system_info.ncc,
        bcc: to_work.system_info.bcc,
        mnc: mnc,
        mcc: mcc,
        _id: el._id,
        timestamp: table[0]._source?.["timestampPrimit"],
        markImport: to_work.marker ?? false,
      }
    };
  });

  //Grupare dupa canal
  let grpDataCanal = groupBy(filteredData, "uniqueCh");
  let mergedChannelData = [];
  Object.keys(grpDataCanal).forEach((canal) => {
    let aggData = grpDataCanal[canal].reduce((acc, curr) => {
      if (!acc.params) return acc = { ...curr };
      if (acc.params?.putere < curr.params.putere) {
        return acc = { ...curr, params: { ...curr.params, vecini: uniqueFromArray([...curr.params.vecini, ...(acc.params?.vecini ? acc.params?.vecini : [])]) } }
      }
      return acc = { ...curr, params: { ...acc.params, vecini: uniqueFromArray([...curr.params.vecini, ...(acc.params?.vecini ? acc.params?.vecini : [])]) } }
    }, {});
    mergedChannelData.push(aggData);
  });

  let groupData = groupBy(mergedChannelData, "operator", "params");

  Object.keys(groupData).forEach((item) => {
    let serv = groupData[item]
      .sort((a, b) => {
        if (a.putere > b.putere) return -1;
        if (a.putere < b.putere) return 1;
        return 0;
      })
      .filter((el) => {
        if (el.vecini.length) return el;
      })[0];
    servings[item] = { ...serv };
  }); // de avut grija la gsm cand sunt doua benzi, trb sa returneze x puteri
  return {
    vecini: groupData,
    serv: servings,
  };
};

/**
 * Analiza scor per banda operator
 * @param {obj} serv // obiect cu un serving
 * @param {array} vecini // vecinii servingului din argument
 * @returns scor
 */
const getScore_GSM = (vecini = [], serving = {}) => {
  let ord_vecini = vecini.sort((a, b) => {
    if (a.putere < b.putere) return -1;
    if (a.putere > b.putere) return 1;
    return 0;
  });

  let arfcn_list = vecini.reduce((acc, curr) => {
    return (acc = [...acc, ...curr.vecini]);
  }, []);
  let unique_arfcn_list = uniqueFromArray(arfcn_list);
  let score_arr = [];

  let lac_vec = vecini.map((ve) => {
    return ve.lac;
  });
  let cell_vec = vecini.map((ve) => {
    return ve.cell_id;
  });

  for (let i = 0; i < unique_arfcn_list.length; i++) {
    // parcurg fiecare elem din lista de unice
    let score_obj = {}; // obiect de forma key (canal unic din lista) : scor (int)
    let canal = unique_arfcn_list[i];
    score_obj.canal = canal;
    score_obj.scor = 0;
    score_obj.aparitii = 0;
    score_obj.vizibil = 0;
    score_obj.rssi = 0;

    for (let j = 0; j < ord_vecini.length; j++) {
      // parcurg viecare element din vecini

      if (ord_vecini[j].vecini.includes(canal)) {
        score_obj.scor = score_obj.scor + Math.pow(2, j);
        score_obj.aparitii = score_obj.aparitii + 1;
      }
      if (ord_vecini[j].canal == canal) {
        score_obj.scor = score_obj.scor - Math.pow(2, j);
        score_obj.vizibil = 1;
        score_obj.rssi = ord_vecini[j].putere;
        let { new_lac, lac_list } = incrCellInfo(lac_vec, "lac");
        score_obj.cell_info = {
          ...ord_vecini[j],
          lac: new_lac,
          cellIdVecini: cell_vec ?? [],
          cell_id: incrCellInfo(cell_vec, "cell_id"),
          lac_list,
        };
      }
    }
    if (score_obj.vizibil == 0) {
      let { new_lac, lac_list } = incrCellInfo(lac_vec, "lac");
      score_obj.cell_info = {
        ...serving,
        lac: new_lac,
        cell_id: incrCellInfo(cell_vec, "cell_id"),
        cellIdVecini: cell_vec ?? [],
        lac_list,
      };
    }
    score_obj.serving = {
      ...serving,
    };
    score_arr.push(score_obj);
  }
  let sort_scor = score_arr.sort((a, b) => {
    if (a.scor > b.scor) return -1;
    if (a.scor < b.scor) return 1;
    return 0;
  });
  return sort_scor;
};

const getRecomandare2G = (data_2G = []) => {
  let { vecini, serv } = formatData(data_2G, channels);
  let rec_obj = {};
  for (const key in vecini) {
    rec_obj[key] = getScore_GSM(vecini[key], serv[key])[0];
  }
  return rec_obj;
};

module.exports.getRecomandare2G = getRecomandare2G;
