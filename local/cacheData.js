const fs = require('fs');
const { CACHE } = require('../conf.json')

let cacheData = {
    recomandare: [],
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
                let filterData = tempData.filter(cell => !lockedCells.includes(cell.elasticID));
                tempData = [...lockedCells, ...filterData];
            }
            fs.writeFileSync(CACHE.path, JSON.stringify(tempData));
            return this.recomandare = [...tempData];
        } catch (error) {
            console.log(error);
            return this.recomandare = [...data];
        }
    }
}


module.exports = cacheData;
