import Course from "./course";
import Type from "./type";

export default class CourseClass {
    public courseName: string;
    public instanceOfType: Course[];
    public numRows: number;
    constructor(name: string) {
        this.courseName = name;
        this.instanceOfType = [];
        this.numRows = 0;
    }
}
