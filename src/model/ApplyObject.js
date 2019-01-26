"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("../controller/IInsightFacade");
class ApplyObject {
    constructor(object, applyKey, groupCriteria, value, id) {
        this.objectTo = object;
        this.apply = new Map();
        this.apply.set(applyKey, value);
        this.groupCriteria = new Map();
        this.setGroupCriteria(object, groupCriteria, id);
    }
    setGroupCriteria(object, groupCriteria, id) {
        let self = this;
        if (id === IInsightFacade_1.InsightDatasetKind.Rooms) {
            for (let criteria of groupCriteria) {
                let thisKey = criteria.toUpperCase();
                let val = object[thisKey];
                self.groupCriteria.set(criteria, val);
            }
        }
        else {
            for (let criteria of groupCriteria) {
                let thisKey = criteria.toUpperCase();
                let val = object[thisKey];
                self.groupCriteria.set(criteria, val);
            }
        }
    }
    getResponse(columns) {
        let full = {};
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
        return full;
    }
}
exports.default = ApplyObject;
//# sourceMappingURL=ApplyObject.js.map