import InstanceOfType from "./InstanceOfType";
import Room from "./room";
import Course from "./course";

export default class Type {
    public instanceOfType: Course[] | Room[];
    constructor() {
        this.instanceOfType = [];
    }
}
