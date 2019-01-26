import Type from "./type";
import InstanceOfType from "./InstanceOfType";

export default class Room {
    public newCols: Map<string, any>;
    public ROOMS_FULLNAME: string; // Full building name (e.g., "Hugh Dempster Pavilion").
    public ROOMS_SHORTNAME: string; // Short building name (e.g., "DMP").
    public ROOMS_NUMBER: string; // The room number. Not always a number, so represented as a string.
    public ROOMS_NAME: string; // The room id; should be rooms_shortname+"_"+rooms_number.
    public ROOMS_ADDRESS: string; // The building address. (e.g., "6245 Agronomy Road V6T 1Z4").
    public ROOMS_LAT: number; // The latitude of the building. Instructions for getting this field are below.
    public ROOMS_LON: number; // The longitude of the building, as described under finding buildings' geolocation.
    public ROOMS_SEATS: number; // The number of seats in the room.
    public ROOMS_TYPE: string; // The room type (e.g., "Small Group").
    public ROOMS_FURNITURE: string; // The room type (e.g., "Classroom-Movable Tables & Chairs").
    public ROOMS_HREF: string; // The link to full details online (More Info)
    constructor(allTDS: any, buildingInfo: any) {
        this.newCols =  new Map<string, any>();
        this.buildRoom(allTDS, buildingInfo);
    }
    private buildRoom(allTDS: any, buildingInfo: any) {
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
    public getCourseResponse(columns: string[]) {
        let full: any = {};
        for (let col of columns) {
            let col4 = col;
            col = "rooms_" + col.split("_")[1];
            let col3 = "rooms_" + col.split("_")[1];
            let key: any = col3.toUpperCase();
            let finalKey: (keyof Room) = key;
            if (finalKey === "ROOMS_SEATS" || finalKey === "ROOMS_LAT" || finalKey === "ROOMS_LON") {
                full[col4] = Number(this[finalKey]);
            } else {
                full[col4] = this[finalKey];
            }
        }
        return full;
    }
}
