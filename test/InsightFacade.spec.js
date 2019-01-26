"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const IInsightFacade_1 = require("../src/controller/IInsightFacade");
const InsightFacade_1 = require("../src/controller/InsightFacade");
const Util_1 = require("../src/Util");
const TestUtil_1 = require("./TestUtil");
describe("InsightFacade Add/Remove Dataset", function () {
    const datasetsToLoad = {
        courses: "./test/data/courses.zip",
        courses2: "./test/data/courses.zip",
        rooms: "./test/data/rooms.zip",
        empty: "./test/data/empty.zip",
        coursesRar: "./test/data/courses.rar",
        coursesInvalidJSONFormat: "./test/data/coursesInvalidJSONFormat.zip",
        coursesInvalidDirectory: "./test/data/coursesInvalidDirectory.zip",
        coursesOnlyValid: "./test/data/coursesOnlyValid.zip",
        JSONFormatNoCourse: "./test/data/JSONFormatNoCourse.zip",
        ValidAndInvalidJSON: "./test/data/ValidAndInvalidJSON.zip",
        pictureInvalid: "./test/data/picture.zip",
        oneSectionInvalidJSON: "./test/data/coursesOneSectionWrongJSONV2.zip",
        small: "./test/data/small.zip"
    };
    let insightFacade;
    let datasets;
    before(function () {
        return __awaiter(this, void 0, void 0, function* () {
            Util_1.default.test(`Before: ${this.test.parent.title}`);
            try {
                const loadDatasetPromises = [];
                for (const [id, path] of Object.entries(datasetsToLoad)) {
                    loadDatasetPromises.push(TestUtil_1.default.readFileAsync(path));
                }
                const loadedDatasets = (yield Promise.all(loadDatasetPromises)).map((buf, i) => {
                    return { [Object.keys(datasetsToLoad)[i]]: buf.toString("base64") };
                });
                datasets = Object.assign({}, ...loadedDatasets);
                chai_1.expect(Object.keys(datasets)).to.have.length.greaterThan(0);
            }
            catch (err) {
                chai_1.expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
            }
            try {
                insightFacade = new InsightFacade_1.default();
            }
            catch (err) {
                Util_1.default.error(err);
            }
            finally {
                chai_1.expect(insightFacade).to.be.instanceOf(InsightFacade_1.default);
            }
        });
    });
    beforeEach(function () {
        Util_1.default.test(`BeforeTest: ${this.currentTest.title}`);
    });
    after(function () {
        Util_1.default.test(`After: ${this.test.parent.title}`);
    });
    afterEach(function () {
        Util_1.default.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("Should list all datasets - there will be none", () => __awaiter(this, void 0, void 0, function* () {
        const id = [];
        let response;
        try {
            response = yield insightFacade.listDatasets();
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.have.length(0);
            chai_1.expect(response).to.deep.equal([]);
        }
    }));
    it("Should add a valid dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "rooms";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Rooms);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.deep.equal([id]);
        }
    }));
    it("Should list all datasets - there will be one", () => __awaiter(this, void 0, void 0, function* () {
        let expected = [{
                id: "rooms",
                kind: IInsightFacade_1.InsightDatasetKind.Rooms,
                numRows: 364
            }];
        let response;
        try {
            response = yield insightFacade.listDatasets();
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.have.length(1);
            chai_1.expect(response).to.deep.equal(expected);
        }
    }));
    it("Should add another/different valid dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "courses";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.contain(id);
            chai_1.expect(response).to.contain("rooms");
        }
    }));
    it("Should list all datasets - there will be two", () => __awaiter(this, void 0, void 0, function* () {
        let response;
        let expected = [{
                id: "rooms",
                kind: IInsightFacade_1.InsightDatasetKind.Rooms,
                numRows: 364
            }, {
                id: "courses",
                kind: IInsightFacade_1.InsightDatasetKind.Courses,
                numRows: 64612
            }];
        try {
            response = yield insightFacade.listDatasets();
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.have.length(2);
            chai_1.expect(response).to.deep.equal(expected);
        }
    }));
    it("Should fail to add a valid duplicate courses dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "courses";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add rooms dataset duplicate", () => __awaiter(this, void 0, void 0, function* () {
        const id = "rooms";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Rooms);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add an empty zip", () => __awaiter(this, void 0, void 0, function* () {
        const id = "empty";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add courses (rar file)", () => __awaiter(this, void 0, void 0, function* () {
        const id = "coursesRar";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add courses dataset due to Invalid JSON formatting", () => __awaiter(this, void 0, void 0, function* () {
        const id = "coursesInvalidJSONFormat";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add courses dataset due to Invalid Directory", () => __awaiter(this, void 0, void 0, function* () {
        const id = "coursesInvalidDirectory";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add courses dataset due to the fact its a picture", () => __awaiter(this, void 0, void 0, function* () {
        const id = "pictureInvalid";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should add courses dataset with only valid files", () => __awaiter(this, void 0, void 0, function* () {
        const id = "coursesOnlyValid";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.deep.equal(["rooms", "courses", "coursesOnlyValid"]);
        }
    }));
    it("Should remove the courses dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "coursesOnlyValid";
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.deep.equal(id);
        }
    }));
    it("Should add courses dataset with only valid files", () => __awaiter(this, void 0, void 0, function* () {
        const id = "courses2";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.deep.equal(["rooms", "courses", "courses2"]);
        }
    }));
    it("Should fail to add dataset due to lack of course sections", () => __awaiter(this, void 0, void 0, function* () {
        const id = "JSONFormatNoCourse";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should add dataset with some valid and also invalid JSON files", () => __awaiter(this, void 0, void 0, function* () {
        const id = "ValidAndInvalidJSON";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.deep.equal(["rooms", "courses", "courses2", "ValidAndInvalidJSON"]);
        }
    }));
    it("Should fail to add dataset with a null ID", () => __awaiter(this, void 0, void 0, function* () {
        const id = null;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add dataset with undefined ID", () => __awaiter(this, void 0, void 0, function* () {
        const id = undefined;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add dataset with an ID that doesnt exist", () => __awaiter(this, void 0, void 0, function* () {
        const id = "InvalidID";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add dataset with a null ID rooms", () => __awaiter(this, void 0, void 0, function* () {
        const id = null;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Rooms);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add dataset with undefined ID rooms", () => __awaiter(this, void 0, void 0, function* () {
        const id = undefined;
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Rooms);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add dataset with an ID that doesnt exist rooms", () => __awaiter(this, void 0, void 0, function* () {
        const id = "InvalidID";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Rooms);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to add dataset because CPEN 491 fails to contain a valid course section", () => __awaiter(this, void 0, void 0, function* () {
        const id = "oneSectionInvalidJSONV2";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should remove the courses dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "courses";
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.deep.equal(id);
        }
    }));
    it("Should remove the rooms dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "rooms";
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.deep.equal(id);
        }
    }));
    it("Should fail to remove a dataset that doesn't exist", () => __awaiter(this, void 0, void 0, function* () {
        const id = "CoursesNonExistent";
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.NotFoundError);
        }
    }));
    it("Should fail to remove a dataset that has already been deleted", () => __awaiter(this, void 0, void 0, function* () {
        const id = "courses";
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.NotFoundError);
        }
    }));
    it("Should fail to remove a dataset that has already been deleted rooms", () => __awaiter(this, void 0, void 0, function* () {
        const id = "rooms";
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.NotFoundError);
        }
    }));
    it("Should fail to remove a dataset with empty string", () => __awaiter(this, void 0, void 0, function* () {
        const id = "";
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to remove a dataset with null", () => __awaiter(this, void 0, void 0, function* () {
        const id = null;
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should fail to remove a dataset with undefined", () => __awaiter(this, void 0, void 0, function* () {
        const id = undefined;
        let response;
        try {
            response = yield insightFacade.removeDataset(id);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
        }
    }));
    it("Should add a small dataset", () => __awaiter(this, void 0, void 0, function* () {
        const id = "small";
        let response;
        try {
            response = yield insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        }
        catch (err) {
            response = err;
        }
        finally {
            chai_1.expect(response).to.deep.equal(["courses2", "ValidAndInvalidJSON", "small"]);
        }
    }));
});
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery = {
        rooms: "./test/data/rooms.zip",
        courses: "./test/data/courses.zip",
        small: "./test/data/small.zip"
    };
    let insightFacade;
    let testQueries = [];
    before(function () {
        return __awaiter(this, void 0, void 0, function* () {
            Util_1.default.test(`Before: ${this.test.parent.title}`);
            try {
                testQueries = yield TestUtil_1.default.readTestQueries();
                chai_1.expect(testQueries).to.have.length.greaterThan(0);
            }
            catch (err) {
                chai_1.expect.fail("", "", `Failed to read one or more test queries. ${JSON.stringify(err)}`);
            }
            try {
                insightFacade = new InsightFacade_1.default();
            }
            catch (err) {
                Util_1.default.error(err);
            }
            finally {
                chai_1.expect(insightFacade).to.be.instanceOf(InsightFacade_1.default);
            }
            try {
                const loadDatasetPromises = [];
                for (const [id, path] of Object.entries(datasetsToQuery)) {
                    loadDatasetPromises.push(TestUtil_1.default.readFileAsync(path));
                }
                const loadedDatasets = (yield Promise.all(loadDatasetPromises)).map((buf, i) => {
                    return { [Object.keys(datasetsToQuery)[i]]: buf.toString("base64") };
                });
                chai_1.expect(loadedDatasets).to.have.length.greaterThan(0);
                const responsePromises = [];
                const datasets = Object.assign({}, ...loadedDatasets);
                responsePromises.push(insightFacade.addDataset("courses", datasets["courses"], IInsightFacade_1.InsightDatasetKind.Courses));
                responsePromises.push(insightFacade.addDataset("rooms", datasets["rooms"], IInsightFacade_1.InsightDatasetKind.Rooms));
                try {
                    const responses = yield Promise.all(responsePromises);
                    responses.forEach((response) => chai_1.expect(response).to.be.an("array"));
                }
                catch (err) {
                    Util_1.default.warn(`Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`);
                }
            }
            catch (err) {
                chai_1.expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
            }
        });
    });
    beforeEach(function () {
        Util_1.default.test(`BeforeTest: ${this.currentTest.title}`);
    });
    after(function () {
        Util_1.default.test(`After: ${this.test.parent.title}`);
    });
    afterEach(function () {
        Util_1.default.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("Should run test queries", () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, () => __awaiter(this, void 0, void 0, function* () {
                    let response;
                    try {
                        response = yield insightFacade.performQuery(test.query);
                    }
                    catch (err) {
                        response = err;
                    }
                    finally {
                        if (test.isQueryValid) {
                            chai_1.expect(response).to.deep.equal(test.result);
                        }
                        else {
                            chai_1.expect(response).to.be.instanceOf(IInsightFacade_1.InsightError);
                        }
                    }
                }));
            }
        });
    });
});
//# sourceMappingURL=InsightFacade.spec.js.map