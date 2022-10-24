const { uniqueFromArray, groupBy, incrCellInfo } = require("./src");
const channels = require("./channels.json");

const formatData = (table = [], channels) => {
  if (!table) return null;

  let list_ch = [];
  list_ch = table.map((elem, id) => {
    let to_work = elem._source.system_info;
    let mnc = to_work.plmn[0].mnc
      .join("")
      .slice(0, to_work.plmn[0].mnc_length || 2);
    let mcc = to_work.plmn[0].mcc.join("");

    let obj = {
      rat: "3G",
      rscp: to_work.cell_info[0].rscp,
      uarfcn: to_work.uarfcn,
      band: to_work.band ?? -99,
      cell_id: to_work.cell_info[0].network_cell_id,
      mnc: mnc,
      mcc: mcc,
      rac: elem._source.system_info.rac,
      psc: elem._source.system_info.cell_info[0].psc,
      t3212: elem._source.system_info.t3212,
      lac: elem._source.system_info.lac,
      rnc_id: 0, // rnc_id de schimbat
      intra: [],
      inter: [],
      timestamp: table[0]._source["@timestamp"],
      id: elem._id,
      mcc_mnc: `${mcc}-${mnc}`,
      markImport: elem._source.marker ?? false,
    };
    let tmp_intra = to_work.cell_info[0].intra_freq_cell_list.filter((cell) => {
      if (cell.cell_id != -1) return cell;
    });
    obj.intra = tmp_intra.map((obj) => {
      return obj.psc;
    });
    let tmp_inter = to_work.cell_info[0].inter_freq_cell_list.filter((cell) => {
      if (cell.cell_id != -1 || cell.dl_uarfcn != -1) {
        return cell;
      }
    });
    obj.inter = tmp_inter.map((obj) => {
      return { uarfcn: obj.dl_uarfcn, psc: obj.psc };
    });
    return sanitErrorScan(obj, table);
  });
  return list_ch;
};

const sanitErrorScan = (cell, table) => {
  if (cell.lac != -1) return cell;
  let filterCanal = table.filter(
    (elem) => elem._source.system_info.uarfcn == cell.uarfcn
  );
  if (!filterCanal.every((elem) => elem._source.system_info.lac == -1))
    return cell;

  let pscToExclude = filterCanal.map((elem) => {
    return elem._source.system_info.cell_info[0].psc;
  });

  let pscToComplete = [506, 507, 508, 509, 510, 511];

  let i = 0;
  let k = 1;
  while (i < pscToComplete.length) {
    if (pscToComplete[i] == 1) {
      console.log("Eroare autocompletare PSC linia 70");
      i++;
      continue;
    }
    if (pscToExclude.includes(pscToComplete[i])) {
      pscToComplete[i] = pscToComplete[0] - k;
      k++;
      continue;
    }
    i++;
  }

  let max = Math.pow(2, 16);

  let newCell = {
    ...cell,
    lac: Math.floor(Math.random() * (max - 1)),
    cell_id: Math.floor(Math.random() * (max - 1)),
    intra: [...cell.intra, ...pscToComplete],
    rac: cell.rac || Math.floor(Math.random() * 254),
  };
  return newCell;
};

const getScore_UMTS = (table = []) => {
  let data_operator = groupBy(table, "mcc_mnc");
  let obj = {};
  for (const mcc_mnc in data_operator) {
    obj[mcc_mnc] = {};
    let data_canal = groupBy(data_operator[mcc_mnc], "uarfcn");
    let ch_mnc = Object.keys(data_canal).map((el) => {
      return parseInt(el);
    });

    let lacListBrut = data_operator[mcc_mnc].map((el) => {
      return el.lac;
    });
    let lac_op = uniqueFromArray(lacListBrut);

    let cellOpBrut = data_operator[mcc_mnc].map((el) => {
      return el.cell_id;
    });
    let cell_op = uniqueFromArray(cellOpBrut);

    for (const canal in data_canal) {
      let serv = data_canal[canal]
        .sort((a, b) => {
          if (a.rscp > b.rscp) return -1;
          if (a.rscp < b.rscp) return 1;
          return 0;
        })
        .filter((el) => {
          if (
            !el.intra.every((psc) => {
              if (psc == -1) {
                return true;
              }
            })
          )
            return el;
        })[0];
      if (!serv) continue;
      let psc_gr = groupBy(data_canal[canal], "psc");

      let reducedObj = {};
      for (const psc_k in psc_gr) {
        reducedObj[psc_k] = psc_gr[psc_k].reduce(
          (acc, curr) => {
            return (acc = {
              ...acc,
              ...curr,
              intra: uniqueFromArray([...acc?.intra, ...curr.intra]),
              inter: uniquePsc([...acc?.inter, ...curr.inter]),
            });
          },
          { intra: [], inter: [] }
        );
      }

      let pscAll = data_canal[canal].map((el) => {
        return el.psc;
      });

      let psc = uniqueFromArray(pscAll);

      let intra = Object.values(reducedObj)
        .reduce((acc, curr) => {
          return (acc = [...acc, ...curr.intra]);
        }, [])
        .filter((el) => {
          if (el != -1 && !psc.includes(el)) return el;
        });

      let inter = Object.values(reducedObj).reduce((acc, curr) => {
        return (acc = [...acc, ...curr.inter]);
      }, []);

      let { new_lac, lac_list } = incrCellInfo(lac_op, "lac");
      obj[mcc_mnc][canal] = {
        intra,
        inter,
        cell_info: {
          ...serv,
          lac: new_lac,
          lac_list,
          cell_id: incrCellInfo(cell_op, "cell_id"),
          cell_list: [...cell_op],
        },
        serving: { ...serv },
      };
    }

    for (const ch in obj[mcc_mnc]) {
      let inter = obj[mcc_mnc][ch].inter;
      let filt_inter = inter;
      let canal_pr = 0;

      for (let m = 0; m < filt_inter.length; m++) {
        canal_pr = filt_inter[m].uarfcn || canal_pr;
        if (ch_mnc.includes(canal_pr)) {
          obj[mcc_mnc][canal_pr]?.intra.push(filt_inter[m].psc);
        }
      }
    }

    for (const ch2 in obj[mcc_mnc]) {
      obj[mcc_mnc][ch2] = {
        ...obj[mcc_mnc][ch2],
        scor: [...calcApp(obj[mcc_mnc][ch2].intra)],
        verificare: [...obj[mcc_mnc][ch2].intra],
      };
    }
  }

  let struct_tab = {};
  for (const op in obj) {
    for (const canal in obj[op]) {
      struct_tab[`${op}-${canal}`] = {
        ...obj[op][canal],
        scor: obj[op][canal].scor.slice(0, 5),
      };
    }
  }
  return struct_tab;
};

const calcApp = (intra = []) => {
  let scor_obj = intra.reduce((acc, curr) => {
    return acc[curr] ? ++acc[curr] : (acc[curr] = 1), acc;
  }, {});
  let result_arr = Object.keys(scor_obj).map((el) => {
    return { psc: parseInt(el), scor: scor_obj[el] };
  });
  return result_arr.sort((a, b) => {
    if (a.scor > b.scor) return -1;
    if (a.scor < b.scor) return 1;
    if (a.psc > b.psc) return -1;
    if (a.psc < b.psc) return 1;
    return 0;
  });
};


const uniquePsc = (a = []) => {
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i].psc === a[j].psc) a.splice(j--, 1);
        }
    }
    
    return a;
};

const getRecomandare3G = (data_3G = []) => {
  let org = formatData(data_3G, channels);
  let score_list = getScore_UMTS(org);
  return score_list;
};

module.exports.getRecomandare3G = getRecomandare3G;