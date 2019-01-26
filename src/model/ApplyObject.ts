import Room from "./room";
import Course from "./course";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";

export default class ApplyObject {
    public apply: Map<string, any>;
    public groupCriteria: Map<string, any>;
    public objectTo: any;
    constructor(object: any, applyKey: string, groupCriteria: string[], value: any, id: InsightDatasetKind) {
        this.objectTo = object;
        this.apply = new Map<string, any>();
        this.apply.set(applyKey, value);
        this.groupCriteria = new Map<string, any>();
        this.setGroupCriteria(object, groupCriteria, id);
    }
    public setGroupCriteria(object: any, groupCriteria: string[], id: string) {
        let self = this;
        if (id === InsightDatasetKind.Rooms) {
            for (let criteria of groupCriteria) {
                let thisKey = (criteria as string).toUpperCase();
                let val = object[thisKey as keyof Room];
                self.groupCriteria.set(criteria, val);
            }
        } else {
            for (let criteria of groupCriteria) {
                let thisKey = (criteria as string).toUpperCase();
                let val = object[thisKey as keyof Room];
                self.groupCriteria.set(criteria, val);
            }
        }
    }
    public getResponse(columns: string[]) {
        let full: any = {};
        let self = this;
        for (let col of columns) {
            if (!self.apply.has(col) && !self.groupCriteria.has(col)) {
                return false;
            }
            if (self.apply.has(col)) {
                full[col] = self.apply.get(col);
            }
            if (self.groupCriteria.has(col)) {
                full[col] = self.groupCriteria.get(col);
            }
        }
        //
        return full;
    }
}
