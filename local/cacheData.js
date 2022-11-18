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

const compareArr = (arr1, arr2) => {
    const array2Sorted = arr2.slice().sort();
    return (arr1.length === arr2.length && arr1.slice().sort().every(function (value, index) {
        return value === array2Sorted[index];
    }));
}

let cacheData = {
    recomandare: [],
    iteratii: 0,
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
            if (this.recomandare.length && lockedChannels.length) {
                let lockedCells = this.recomandare.filter((cell) => {
                    if (lockedChannels.includes(cell.elasticID)) {
                        cell.locked = true;
                        return cell;
                    }
                });
                let filterData = tempData.filter(cell => {
                    if (!lockedChannels.includes(cell.elasticID)) return cell;
                });
                tempData = [...lockedCells, ...filterData];
            } else if (this.recomandare.length) {
                let oldCells = getCellsList(this.recomandare);
                let newCells = getCellsList(data);
                if (compareArr(oldCells.GSM, newCells.GSM) && compareArr(oldCells.UMTS, newCells.UMTS) && compareArr(oldCells.LTE, newCells.LTE)) {
                    this.iteratii = this.iteratii + 1;
                    // console.log(this.iteratii)
                } else
                    this.iteratii = 0;
            }
            tempData = tempData.map((cell) => {
                if (this.iteratii < 3) return {
                    ...cell,
                    completed: false
                }
                return {
                    ...cell,
                    completed: true
                }
            })
            fs.writeFileSync(CACHE.path, JSON.stringify(tempData));
            return this.recomandare = [...tempData];
        } catch (error) {
            console.log(error);
            return this.recomandare = [...data];
        }
    },
    resetIteratii: function () {
        return this.iteratii = 0;
    }
}

module.exports = cacheData;
