module.exports = {
    getObjects: function(obj, key, val) {
        var objects = [];
        for (var i in obj) {
          if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == 'object') {
                objects = objects.concat(this.getObjects(obj[i], key, val));
            } else if (i == key && obj[key] == val) {
                objects.push(obj);
            }
        }
        return objects;
    },
    getClientObj: function(name, maxPurse, maxWaitees) {
        return  {
            "name": name,
            "purseBalance": maxPurse,
            "playersPurschasedCount": 0,
            "waiteesAvailable": maxWaitees,
            "biddingMode": "manual"
        };
    }
};