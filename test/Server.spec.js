"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Server_1 = require("../src/rest/Server");
const InsightFacade_1 = require("../src/controller/InsightFacade");
const chai = require("chai");
const chaiHttp = require("chai-http");
const Util_1 = require("../src/Util");
const fs = require("fs");
const chai_1 = require("chai");
const IInsightFacade_1 = require("../src/controller/IInsightFacade");
describe("Facade D3", function () {
    let facade = null;
    let server = null;
    chai.use(chaiHttp);
    before(function () {
        facade = new InsightFacade_1.default();
        server = new Server_1.default(4321);
        return server.start();
    });
    after(function () {
        return server.stop();
    });
    beforeEach(function () {
    });
    afterEach(function () {
    });
    it("ECHO", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/echo/ServerWorking")
                .then(function (res) {
                Util_1.default.trace("Here");
                chai_1.expect(res.status).to.be.equal(200);
                chai_1.expect(res.body.result).to.equal("ServerWorking...ServerWorking");
            }).catch(function (err) {
                Util_1.default.trace("err");
                chai_1.expect.fail();
                Util_1.default.error("Error" + err);
            });
        }
        catch (err) {
            Util_1.default.trace("Get Error");
        }
    });
    it("Error", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/test")
                .then(function (res) {
                Util_1.default.trace("Here");
                chai_1.expect.fail();
            }).catch(function (err) {
                Util_1.default.trace("err");
                chai_1.expect(err.status).to.be.equal(500);
            });
        }
        catch (err) {
            Util_1.default.trace("Get Error");
        }
    });
    it("PUT test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync("./test/data/courses.zip"), "courses.zip")
                .then(function (res) {
                Util_1.default.trace("Dataset added");
                chai_1.expect(res.status).to.be.equal(200);
            }).catch(function (err) {
                Util_1.default.trace("Error in adding dataset");
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.trace("Put Error");
        }
    });
    it("PUT test for courses dataset - duplicate should fail", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync("./test/data/courses.zip"), "courses.zip")
                .then(function (res) {
                Util_1.default.trace("Dataset added");
                chai_1.expect.fail();
            }).catch(function (err) {
                Util_1.default.trace("Error in adding dataset");
                chai_1.expect(err.status).to.be.equal(400);
            });
        }
        catch (err) {
            Util_1.default.trace("Put Error");
        }
    });
    it("PUT test for rooms dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .attach("body", fs.readFileSync("./test/data/rooms.zip"), "rooms.zip")
                .then(function (res) {
                Util_1.default.trace("Dataset added");
                chai_1.expect(res.status).to.be.equal(200);
            }).catch(function (err) {
                Util_1.default.trace("Error in adding dataset");
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.trace("Put Error");
        }
    });
    it("PUT test for rooms dataset - duplicate should fail", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .attach("body", fs.readFileSync("./test/data/rooms.zip"), "rooms.zip")
                .then(function (res) {
                Util_1.default.trace("Dataset added");
                chai_1.expect.fail();
            }).catch(function (err) {
                Util_1.default.trace("Error in adding dataset");
                chai_1.expect(err.status).to.be.equal(400);
            });
        }
        catch (err) {
            Util_1.default.trace("Put Error");
        }
    });
    it("GET test for rooms dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/datasets")
                .then(function (res) {
                Util_1.default.trace("Datasets listed");
                let expected = [{
                        id: "courses",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612
                    }, {
                        id: "rooms",
                        kind: IInsightFacade_1.InsightDatasetKind.Rooms,
                        numRows: 364
                    }];
                chai_1.expect(res.status).to.be.equal(200);
                chai_1.expect(res.body).to.deep.equal({ result: expected });
            }).catch(function (err) {
                Util_1.default.trace("Error in adding dataset");
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.trace("Get Error");
        }
    });
    it("POST test for courses dataset", function () {
        let query = {
            WHERE: {
                AND: [
                    {
                        LT: {
                            courses_avg: 62
                        }
                    },
                    {
                        IS: {
                            courses_dept: "econ"
                        }
                    }
                ]
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_id",
                    "courses_avg"
                ],
                ORDER: "courses_id"
            }
        };
        try {
            return chai.request("http://localhost:4321")
                .post("/query")
                .send(query)
                .then(function (res) {
                Util_1.default.trace("Performed Query");
                chai_1.expect(res.status).to.be.equal(200);
                chai_1.expect(res.body).to.deep.equal({ result: [
                        { courses_dept: "econ", courses_id: "101", courses_avg: 61.96 },
                        { courses_dept: "econ", courses_id: "101", courses_avg: 60.89 },
                        { courses_dept: "econ", courses_id: "102", courses_avg: 61.04 },
                        { courses_dept: "econ", courses_id: "221", courses_avg: 61.97 }
                    ]
                });
            })
                .catch(function (err) {
                Util_1.default.trace(err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.trace("POST error");
        }
    });
    it("POST test for courses dataset - invalid query", function () {
        let query = {
            WHERE: {
                GT: {
                    courses_avg: "90"
                }
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_avg",
                    "courses_id"
                ],
                ORDER: "courses_avg"
            }
        };
        try {
            return chai.request("http://localhost:4321")
                .post("/query")
                .send(query)
                .then(function (res) {
                Util_1.default.trace("Performed Query");
                chai_1.expect.fail();
            })
                .catch(function (err) {
                Util_1.default.trace("Error in query");
                chai_1.expect(err.status).to.be.equal(400);
            });
        }
        catch (err) {
            Util_1.default.trace("POST error");
        }
    });
    it("DELETE test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res) {
                Util_1.default.trace("Dataset deleted");
                chai_1.expect(res.status).to.be.equal(200);
            })
                .catch(function (err) {
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.trace("Delete error");
        }
    });
    it("DELETE test for courses dataset - already removed", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res) {
                Util_1.default.trace("Dataset deleted");
                chai_1.expect.fail();
            })
                .catch(function (err) {
                chai_1.expect(err.status).to.be.equal(404);
            });
        }
        catch (err) {
            Util_1.default.trace("Delete error");
        }
    });
});
//# sourceMappingURL=Server.spec.js.map