"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Room {
    constructor(allTDS, buildingInfo) {
        this.newCols = new Map();
        this.buildRoom(allTDS, buildingInfo);
    }
    buildRoom(allTDS, buildingInfo) {
        this.ROOMS_NUMBER = allTDS[0].childNodes[1].childNodes[0].value;
        this.ROOMS_SEATS = Number(allTDS[1].childNodes[0].value.trim());
        this.ROOMS_FURNITURE = allTDS[2].childNodes[0].value.trim();
        this.ROOMS_TYPE = allTDS[3].childNodes[0].value.trim();
        this.ROOMS_HREF = allTDS[4].childNodes[1].attrs[0].value;
        this.ROOMS_FULLNAME = buildingInfo[0].childNodes[0].value;
        this.ROOMS_ADDRESS = buildingInfo[1].childNodes[0].value;
        this.ROOMS_SHORTNAME = this.ROOMS_HREF.split("/")[7].split("-")[0];
        this.ROOMS_NAME = this.ROOMS_SHORTNAME + "_" + this.ROOMS_NUMBER;
    }
    getCourseResponse(columns) {
        let full = {};
        for (let col of columns) {
            let col4 = col;
            col = "rooms_" + col.split("_")[1];
            let col3 = "rooms_" + col.split("_")[1];
            let key = col3.toUpperCase();
            let finalKey = key;
            if (finalKey === "ROOMS_SEATS" || finalKey === "ROOMS_LAT" || finalKey === "ROOMS_LON") {
                full[col4] = Number(this[finalKey]);
            }
            else {
                full[col4] = this[finalKey];
            }
        }
        return full;
    }
}
exports.default = Room;
//# sourceMappingURL=room.js.map