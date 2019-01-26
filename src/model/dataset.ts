import CourseClass from "./class";
import {InsightDataset, InsightDatasetKind} from "../controller/IInsightFacade";
import Building from "./building";
import Type from "./type";
import Course from "./course";

export default class Dataset implements InsightDataset {
    public typeMap: Map<string, CourseClass | Building>;
    public id: string;
    public kind: InsightDatasetKind;
    public numRows: number;
    constructor(givenId: string, givenKind: InsightDatasetKind) {
        this.typeMap = new Map<string, CourseClass | Building>();
        this.id = givenId;
        this.kind = givenKind;
        this.numRows = 0;
    }
}
