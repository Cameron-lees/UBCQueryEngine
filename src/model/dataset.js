"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Dataset {
    constructor(givenId, givenKind) {
        this.typeMap = new Map();
        this.id = givenId;
        this.kind = givenKind;
        this.numRows = 0;
    }
}
exports.default = Dataset;
//# sourceMappingURL=dataset.js.map