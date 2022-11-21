const fs = require('fs');
const { CACHE } = require('../conf.json')

const uniqueFromArray = (a = []) => {
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};

const uniqueArrayKey = (arr, key) => {
    let obj = arr.reduce((prev, curr) => {
        return prev = {
            ...prev,
            [curr[key]]: curr
        }
    }, {});
    return Object.keys(obj).map(el => obj[el]);
}

const getCellsList = (data = []) => {
    try {
        return data.reduce((prev, curr) => {
            if (curr.tehnologie === "GSM") {
                return prev = {
                    ...prev,
                    "GSM": uniqueFromArray([...prev.GSM, ...curr.obj_catch.cellIdVecini])
                }
            }
            else if (curr.tehnologie === "UMTS") {
                return prev = {
                    ...prev,
                    "UMTS": uniqueFromArray([...prev.UMTS, ...curr.obj_catch.cellIdVecini])
                }
            }
            else if (curr.tehnologie === "LTE") {
                return prev = {
                    ...prev,
                    "LTE": uniqueFromArray([...prev.LTE, ...curr.obj_catch.cellIdVecini])
                }
            }

        }, {
            "GSM": [],
            "UMTS": [],
            "LTE": []
        });
    } catch (error) {
        console.log(error);
        return {
            "GSM": [],
            "UMTS": [],
            "LTE": []
        }
    }

}
/**
 * Comparare recomandare stocata cu ultima generata.
 * Criterii:
 * -acelasi numar de recomandari;
 * -sa existe cheia unica (mcc-mnc-TEHN-canal);
 * -sa nu difere servingul;
 * -pentru fiecare tehn se va alege un alt grup de criterii suplimentar:
 *          *GSM: scor
 *          *UMTS: psc
 *          *LTE: pci
 * @param {arr} oldRec 
 * @param {arr} newRec 
 * @returns {boolean}
 */
const compareRecomand = (oldRec, newRec) => {
    if (oldRec.length !== newRec.length) return false;
    return newRec.every((rec) => {
        let oldElem = oldRec.filter(el => el.elasticID === rec.elasticID);
        if (!oldElem.length) return false;
        if (oldElem[0].serv_cell !== rec.serv_cell) {
            return false;
        }
        if (rec.tehnologie === "GSM") {
            if (rec.rec_ch !== oldElem[0].rec_ch) {
                return false
            }
        } else if (rec.tehnologie === "UMTS") {
            if (rec.obj_catch.psc !== oldElem[0].obj_catch.psc) {
                return false
            }

        } else if (rec.tehnologie === "LTE") {
            if (rec.obj_catch.pci !== oldElem[0].obj_catch.pci) {
                return false
            }
        }
        return true;
    });
}

const compareArr = (oldArr, newArr) => {
    const oldArrSorted = oldArr.slice().sort();
    const newArrSorted = newArr.slice().sort();
    return newArrSorted.every(cell => oldArrSorted.includes(cell));
}

let cacheData = {
    recomandare: [],
    iteratii: 0,
    lockedRec: [],
    getData: function () {
        try {
            if (fs.existsSync(CACHE.path)) {
                return this.recomandare = require(CACHE.file);
            }
        } catch (error) {
            console.log(error)
        }
    },
    setData: function (data, lockedChannels = []) {
        let tempData = [...data];
        try {
            if (this.recomandare.length) {
                // console.log(compareRecomand(this.recomandare, data))
                if (compareRecomand(this.recomandare, data)) {
                    tempData = [...this.recomandare]
                    this.iteratii = this.iteratii + 1;
                } else {
                    this.iteratii = 0;
                }
            }
            tempData = tempData.map((cell) => {
                if (!lockedChannels.includes(cell.elasticID)) cell.locked = false;
                if (this.iteratii < 3) {
                    return {
                        ...cell,
                        completed: false
                    }
                }
                return {
                    ...cell,
                    completed: true
                }
            });
            tempData = tempData.filter((cell) => {
                if (!lockedChannels.includes(cell.elasticID)) return cell;
            })
            // fs.writeFileSync(CACHE.path, JSON.stringify(tempData));
            return this.recomandare = [...tempData];
        } catch (error) {
            console.log(error);
            return this.recomandare = [...data];
        }
    },
    setLockedCells: function (lockedChannels = []) {
        if (lockedChannels.length === 0) return this.lockedRec = [];
        let tempLocked = [];
        tempLocked = this.recomandare.filter((cell) => {
            if (lockedChannels.includes(cell.elasticID)) {
                cell.locked = true;
                return cell;
            }
        });
        tempLocked = [...tempLocked, ...this.lockedRec].filter(cell => {
            if (lockedChannels.includes(cell.elasticID)) {
                cell.locked = true;
                return cell;
            }
        })
        return this.lockedRec = uniqueArrayKey([...tempLocked], "elasticID");
    },
    resetIteratii: function () {
        return this.iteratii = 0;
    }
}

/**
 *                 let oldCells = getCellsList(this.recomandare);
                let newCells = getCellsList(data);
                if (compareArr(oldCells.GSM, newCells.GSM) && compareArr(oldCells.UMTS, newCells.UMTS) && compareArr(oldCells.LTE, newCells.LTE)) {
                    this.iteratii = this.iteratii + 1;
                } else{
                    console.log("--------------------TRUE----------------------------")
                    console.log(oldCells)
                    console.log("New")
                    console.log(newCells)
                    console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
                    this.iteratii = 0;
                }
 */

module.exports = cacheData;
