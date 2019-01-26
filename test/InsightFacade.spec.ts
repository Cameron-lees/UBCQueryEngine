import { expect } from "chai";

import {
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the JSON schema described in test/query.schema.json
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: string | string[];
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
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

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return {[Object.keys(datasetsToLoad)[i]]: buf.toString("base64")};
            });
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("Should list all datasets - there will be none", async () => {
        const id: string[] = [];
        let response: InsightDataset[];

        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.have.length(0);
            expect(response).to.deep.equal([]);
        }
    });
    // Add Dataset tests
    it("Should add a valid dataset", async () => {
        const id: string = "rooms";
        let response: string[];
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal([id]);
        }
    });

    it("Should list all datasets - there will be one", async () => {
        // const id: string[] = ["courses"];
        // const id: InsightDataset = insightFacade.myDatasets.get("courses");
        let expected = [{
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            numRows: 364
        }];
        let response: InsightDataset[];

        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.have.length(1);
            expect(response).to.deep.equal(expected);
        }
    });

    it("Should add another/different valid dataset", async () => {
        const id: string = "courses";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.contain(id);
            expect(response).to.contain("rooms");
        }
    });
    it("Should list all datasets - there will be two", async () => {
        // const id: string[] = ["courses"];
        // const id: InsightDataset = insightFacade.myDatasets.get("courses");
        let response: InsightDataset[];
        let expected = [{
            id: "rooms",
            kind: InsightDatasetKind.Rooms,
            numRows: 364
        }, {
            id: "courses",
            kind: InsightDatasetKind.Courses,
            numRows: 64612
        }];
        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.have.length(2);
            expect(response).to.deep.equal(expected);
        }
    });
    it("Should fail to add a valid duplicate courses dataset", async () => {
        const id: string = "courses";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("Should fail to add rooms dataset duplicate", async () => {
        const id: string = "rooms";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("Should fail to add an empty zip", async () => {
        const id: string = "empty";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("Should fail to add courses (rar file)", async () => {
        const id: string = "coursesRar";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("Should fail to add courses dataset due to Invalid JSON formatting", async () => {
        const id: string = "coursesInvalidJSONFormat";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("Should fail to add courses dataset due to Invalid Directory", async () => {
        const id: string = "coursesInvalidDirectory";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("Should fail to add courses dataset due to the fact its a picture", async () => {
        const id: string = "pictureInvalid";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("Should add courses dataset with only valid files", async () => {
        const id: string = "coursesOnlyValid";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(["rooms", "courses", "coursesOnlyValid"]);
        }
    });
    it("Should remove the courses dataset", async () => {
        const id: string = "coursesOnlyValid";
        let response: string;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(id);
        }
    });
    it("Should add courses dataset with only valid files", async () => {
        const id: string = "courses2";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(["rooms", "courses", "courses2"]);
        }
    });
    it("Should fail to add dataset due to lack of course sections", async () => {
        const id: string = "JSONFormatNoCourse";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should add dataset with some valid and also invalid JSON files", async () => {
        const id: string = "ValidAndInvalidJSON";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(["rooms", "courses", "courses2", "ValidAndInvalidJSON"]);
        }
    });
    it("Should fail to add dataset with a null ID", async () => {
        const id: string = null;
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should fail to add dataset with undefined ID", async () => {
        const id: string = undefined;
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should fail to add dataset with an ID that doesnt exist", async () => {
        const id: string = "InvalidID";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should fail to add dataset with a null ID rooms", async () => {
        const id: string = null;
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should fail to add dataset with undefined ID rooms", async () => {
        const id: string = undefined;
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should fail to add dataset with an ID that doesnt exist rooms", async () => {
        const id: string = "InvalidID";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should fail to add dataset because CPEN 491 fails to contain a valid course section", async () => {
        const id: string = "oneSectionInvalidJSONV2";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    // Remove Dataset Tests
    it("Should remove the courses dataset", async () => {
        const id: string = "courses";
        let response: string;
        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(id);
        }
    });
    it("Should remove the rooms dataset", async () => {
        const id: string = "rooms";
        let response: string;
        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(id);
        }
    });
    it("Should fail to remove a dataset that doesn't exist", async () => {
        const id: string = "CoursesNonExistent";
        let response: string;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });
    it("Should fail to remove a dataset that has already been deleted", async () => {
        const id: string = "courses";
        let response: string;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });
    it("Should fail to remove a dataset that has already been deleted rooms", async () => {
        const id: string = "rooms";
        let response: string;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });
    it("Should fail to remove a dataset with empty string", async () => {
        const id: string = "";
        let response: string;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should fail to remove a dataset with null", async () => {
        const id: string = null;
        let response: string;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should fail to remove a dataset with undefined", async () => { // expected when null
        const id: string = undefined;
        let response: string;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
            // expect(response).to.throw("Error");
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("Should add a small dataset", async () => {
        const id: string = "small";
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(["courses2", "ValidAndInvalidJSON", "small"]);
        }
    });
});

describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: string } = {
        rooms: "./test/data/rooms.zip",
        courses: "./test/data/courses.zip",
        small: "./test/data/small.zip"
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Create a new instance of InsightFacade, read in the test queries from test/queries and
    // add the datasets specified in datasetsToQuery.
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = await TestUtil.readTestQueries();
            expect(testQueries).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Fail if there is a problem reading ANY dataset.
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToQuery)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return { [Object.keys(datasetsToQuery)[i]]: buf.toString("base64") };
            });
            expect(loadedDatasets).to.have.length.greaterThan(0);

            const responsePromises: Array<Promise<string[]>> = [];
            const datasets: { [id: string]: string } = Object.assign({}, ...loadedDatasets);
            // for (const [id, content] of Object.entries(datasets)) {
            //     responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Rooms));
            //     // responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Courses));
            // }
            // for (const [id, content] of Object.entries(datasets)) {
            //     responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Rooms));
            // }
            responsePromises.push(
                 insightFacade.addDataset("courses", datasets["courses"], InsightDatasetKind.Courses));
            responsePromises.push(
                insightFacade.addDataset("rooms", datasets["rooms"], InsightDatasetKind.Rooms));

            // This try/catch is a hack to let your dynamic tests execute even if the addDataset method fails.
            // In D1, you should remove this try/catch to ensure your datasets load successfully before trying
            // to run you queries.
            try {
                const responses: string[][] = await Promise.all(responsePromises);
                responses.forEach((response) => expect(response).to.be.an("array"));
            } catch (err) {
                Log.warn(`Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`);
            }
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    it("Should run test queries", () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                    it(`[${test.filename}] ${test.title}`, async () => {
                        let response: any[];
                        try {
                            response = await insightFacade.performQuery(test.query);
                        } catch (err) {
                            response = err;
                        } finally {
                            if (test.isQueryValid) {
                                expect(response).to.deep.equal(test.result);
                            } else {
                                expect(response).to.be.instanceOf(InsightError);
                            }
                        }
                    });
            }
        });
    });
});
