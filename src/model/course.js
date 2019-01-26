"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Course {
    constructor(course) {
        this.newCols = new Map();
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
            }
            else {
                this.COURSES_YEAR = Number(course.Year);
            }
        }
        else {
            this.COURSES_YEAR = parseInt(course.Year, 10);
        }
        this.COURSE_NAME = (this.COURSES_DEPT + this.COURSES_ID).toUpperCase();
        this.COURSES_NAME_ID = [this.COURSE_NAME, this.COURSES_UUID];
    }
    getCourseResponse(columns) {
        let full = {};
        for (let col of columns) {
            let col4 = col;
            col = "courses_" + col.split("_")[1];
            let col3 = "courses_" + col.split("_")[1];
            let key = col3.toUpperCase();
            let finalKey = key;
            if (finalKey === "COURSES_UUID") {
                full[col4] = this[finalKey].toString();
            }
            else {
                full[col4] = this[finalKey];
            }
        }
        return full;
    }
}
exports.default = Course;
//# sourceMappingURL=course.js.map