import Room from "./room";
export default class Building {
    public instanceOfType: Room[];
    constructor(rooms: any[]) {
        this.instanceOfType = rooms;
    }
}
