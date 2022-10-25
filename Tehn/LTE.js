const { uniqueFromArray, groupBy, incrCellInfo } = require("./src");
const channels = require("./channels.json");
const grps = {
  Gr1: [0, 125],
  Gr2: [126, 251],
  Gr3: [252, 377],
  Gr4: [378, 503],
};

const formatData = (table = []) => {
  if (!table.length) return null;

  let list_ch = [];
  list_ch = table.map((elem, id) => {
    let to_work = elem.system_info;
    let mcc = to_work.sib1.plmn[0].mcc.join("");
    let mnc = to_work.sib1.plmn[0].mnc
      .join("")
      .slice(0, to_work.sib1.plmn[0].mnc_length || 2);
    let pci = to_work.phy_cell_id;
    let earfcn = to_work.earfcn;
    let band = to_work.sib1.freq_band_indicator; //!!!!!!!!!!!!

    let obj = {
      id: elem._id,
      rat: "4G",
      rssi: to_work.rssi,
      rsrp: to_work.rsrp,
      earfcn: earfcn,
      pci: pci,
      l3cellid: to_work.sib1.l3cell_id,
      band: band,
      intra:
        to_work.sib4?.intra_freq_cells?.map((el) => {
          return el.intraFreqNeighborCellPci;
        }) ?? [],
      mnc: mnc,
      mcc: mcc,
      tac: to_work.sib1.tac,
      timestamp: table[0]._source?.["@timestamp"],
      mcc_mnc: `${mcc}-${mnc}`,
      mcc_mnc_canal: `${mcc}-${mnc}-${earfcn}`,
      markImport: elem._source?.marker ?? false,
    };
    return obj;
  });
  return list_ch;
};

const getVecini = (pci = 0) => {
  if (!pci) return [];

  pci = parseInt(pci);
  let S = 0;
  let PS = 0;
  let vecin1, vecin2;

  S = Math.floor(pci / 3);
  PS = pci % 3;

  if (PS === 0) {
    vecin1 = 3 * S + 1;
    vecin2 = 3 * S + 2;
  }
  if (PS === 1) {
    vecin1 = 3 * S + 0;
    vecin2 = 3 * S + 2;
  }
  if (PS === 2) {
    vecin1 = 3 * S + 1;
    vecin2 = 3 * S + 0;
  }
  return [vecin1, vecin2];
};

const getIntra = (gr_operator = []) => {
  if (!gr_operator.length) return [];
  let intra_f = [];

  for (let i = 0; i < gr_operator.length; i++) {
    let elem = gr_operator[i];
    intra_f = [...intra_f, ...elem.intra];
  }
  return uniqueFromArray(intra_f);
};

const getServing = (gr_operator = []) => {
  if (!gr_operator.length) return [];
  let serv = [];

  for (let i = 0; i < gr_operator.length; i++) {
    let elem = gr_operator[i];
    serv = [...serv, elem.pci];
  }
  return uniqueFromArray(serv);
};

const getListaRedusa = (serving = {}, interzis = []) => {
  let pci_list = [];

  for (let i = 1; i < 28; i++) {
    let pci_gen = getVecini(serving.pci)[1];
    let pci_c = (pci_gen + 90 * i) % 504;
    if (interzis.includes(pci_c)) continue;
    pci_list.push(pci_c);
  }
  return pci_list;
};

const getGrupa = (pci = 0) => {
  pci = parseInt(pci);

  for (const gr in grps) {
    if (pci >= grps[gr][0] && pci <= grps[gr][1]) return gr;
  }
  return "undefined";
};

const filtrareGrupe = (grupe, pci) => {
  let tmp = grupe;
  pci = parseInt(pci);

  if (pci >= grps["Gr4"][0] && pci <= grps["Gr4"][1]) delete tmp["Gr2"];
  else delete tmp["Gr4"];
  return tmp;
};

const getScore_LTE = (lista_redusa = [], serving = {}, list_pci = []) => {
  if (!lista_redusa.length) return 0;

  let result = lista_redusa.map((pci) => {
    let scor = 0;
    let grupa = getGrupa(pci);

    let rez = list_pci.map((el) => {
      return Math.abs(el - pci);
    });

    let min = rez.length ? Math.min(...rez) : 0;
    scor = 10 * Math.abs(serving.pci - pci) + min;

    return {
      pci,
      scor,
      grupa,
    };
  });
  return result;
};

const setRecLTE = (elem_list = []) => {
  if (!elem_list) return null;

  let gr_elem = groupBy(elem_list, "mcc_mnc_canal");
  let gr_mnc = groupBy(elem_list, "mcc_mnc");

  let obj_operator = {};

  for (const mcc_mnc_canal in gr_elem) {
    let vecini = [];
    let serving_pci = [];
    let intra = [];
    let mcc_mnc = gr_elem[mcc_mnc_canal][0].mcc_mnc;

    let tac_op = gr_mnc[mcc_mnc].map((el) => {
      return el.tac;
    });
    let l3cell_op = gr_mnc[mcc_mnc].map((el) => {
      return el.l3cellid;
    });

    for (let i = 0; i < gr_elem[mcc_mnc_canal].length; i++) {
      let elem = gr_elem[mcc_mnc_canal][i];
      vecini = uniqueFromArray([...vecini, ...getVecini(elem.pci)]);
    }
    serving_pci = [...serving_pci, ...getServing(gr_elem[mcc_mnc_canal])];
    intra = [...intra, ...getIntra(gr_elem[mcc_mnc_canal])];

    let serv = gr_elem[mcc_mnc_canal].sort((a, b) => {
      if (a.rssi > b.rssi) return -1;
      if (a.rssi < b.rssi) return 1;
      if (a.rsrp > b.rsrp) return -1;
      if (a.rsrp < b.rsrp) return 1;
      return 0;
    })[0];

    obj_operator[mcc_mnc_canal] = {
      vecini,
      serving_pci,
      intra,
      pci_4_scor: [...serving_pci, ...intra].filter((el) => {
        if (el != serv.pci) return el;
      }),
      pci_interzis: [...vecini, ...serving_pci, ...intra],
      serving_cell: serv,
      lista_redusa: getListaRedusa(serv, [...vecini, ...serving_pci, ...intra]),
      tac_op,
      l3cell_op,
    };
  }

  for (const canal in obj_operator) {
    let scor = getScore_LTE(
      obj_operator[canal].lista_redusa,
      obj_operator[canal].serving_cell,
      obj_operator[canal].pci_4_scor
    );
    let grupe = groupBy(scor, "grupa");
    let filt_grupe = filtrareGrupe(grupe, obj_operator[canal].serving_cell.pci);

    for (const gr in grupe) {
      grupe[gr] = grupe[gr]
        .sort((a, b) => {
          if (a.scor > b.scor) return -1;
          if (a.scor < b.scor) return 1;
          return 0;
        })
        .splice(0, 2);
    }

    obj_operator[canal] = {
      ...obj_operator[canal],
      scor,
      recomandare: {
        tac: incrCellInfo(obj_operator[canal].tac_op, "tac")
          .new_lac,
        l3cellid: incrCellInfo(
          obj_operator[canal].l3cell_op,
          "l3cell_id"
        ),
        ord_pci: ordPci(obj_operator[canal].serving_cell.pci),
        scor_grupat: filt_grupe,
        earfcn: obj_operator[canal].serving_cell.earfcn,
        tac_op: obj_operator[canal].tac_op,
        l3cell_op: obj_operator[canal].l3cell_op,
      },
    };
  }

  return obj_operator;
};

const ordPci = (pci) => {
  if (pci >= grps["Gr1"][0] && pci <= grps["Gr1"][1]) {
    return ["Gr1", "Gr2", "Gr3"];
  }
  if (pci >= grps["Gr2"][0] && pci <= grps["Gr2"][1]) {
    return ["Gr2", "Gr3", "Gr1"];
  }
  if (pci >= grps["Gr3"][0] && pci <= grps["Gr3"][1]) {
    return ["Gr3", "Gr2", "Gr1"];
  }
  if (pci >= grps["Gr4"][0] && pci <= grps["Gr4"][1]) {
    return ["Gr4", "Gr3", "Gr1"];
  }
  return ["Gr1", "Gr2", "Gr3"];
};

const getRecomandare4G = (data_4G = []) => {
  if (!data_4G.length) return {}
  let group_list = formatData(data_4G);
  return setRecLTE(group_list);
}

module.exports.getRecomandare4G = getRecomandare4G;