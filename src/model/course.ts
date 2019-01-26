import Type from "./type";
import InstanceOfType from "./InstanceOfType";

export default class Course {
    public newCols: Map<string, any>;

    // For instance, if the id sent by the user is courses,
    // then the queries you will run will be using the following keys:
    public COURSE_NAME: string;
    public COURSES_ID: string;
    // courses_id: string; The course number (will be treated as a string (e.g., 499b)).
    public COURSES_DEPT: string;
    // courses_dept: string; The department that offered the course.
    public COURSES_AVG: number;
    // courses_avg: number; The average of the course offering.
    public COURSES_INSTRUCTOR: string;
    // courses_instructor: string; The instructor teaching the course offering.
    public COURSES_TITLE: string;
    // courses_title: string; The name of the course.
    public COURSES_PASS: number;
    // courses_pass: number; The number of students that passed the course offering.
    public COURSES_FAIL: number;
    // courses_fail: number; The number of students that failed the course offering.
    public COURSES_AUDIT: number;
    // courses_audit: number; The number of students that audited the course offering.
    public COURSES_UUID: string;
    // courses_uuid: string; The unique id of a course offering.
    public COURSES_YEAR: number;
    // ID IS STILL WRONG NEED TO CHANGE TO ACTUAL ID
    public COURSES_NAME_ID: [string, string];
    // courses_year: number; The year the course offering ran.
    constructor(course: any) {
        this.newCols = new Map<string, any>();
        this.COURSES_AVG = course.Avg;
        this.COURSES_ID = course.Course;
        this.COURSES_DEPT = course.Subject;
        this.COURSES_INSTRUCTOR = course.Professor;
        this.COURSES_TITLE = course.Title;
        this.COURSES_PASS = course.Pass;
        this.COURSES_FAIL = course.Fail;
        this.COURSES_AUDIT = course.Audit;
        this.COURSES_UUID = course.id;
        if (course.Section !== undefined) {
            if (course.Section.toString() === "overall") {
                this.COURSES_YEAR = 1900;
            } else {
                this.COURSES_YEAR = Number(course.Year);
            }
        } else {
            this.COURSES_YEAR = parseInt(course.Year, 10);
        }
        this.COURSE_NAME = (this.COURSES_DEPT + this.COURSES_ID).toUpperCase();
        this.COURSES_NAME_ID = [this.COURSE_NAME, this.COURSES_UUID];
    }
    public getCourseResponse(columns: string[]) {
        let full: any = {};
        for (let col of columns) {
            let col4 = col;
            col = "courses_" + col.split("_")[1];
            let col3 = "courses_" + col.split("_")[1];
            let key: any = col3.toUpperCase();
            let finalKey: (keyof Course) = key;
            if (finalKey === "COURSES_UUID") {
                full[col4] = this[finalKey].toString();
            } else {
                full[col4] = this[finalKey];
            }
        }
        //
        return full;
    }
}
