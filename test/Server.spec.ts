import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");

import chaiHttp = require("chai-http");
import Log from "../src/Util";
import * as fs from "fs";
import {expect} from "chai";
import {InsightDatasetKind} from "../src/controller/IInsightFacade";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        return server.start();
    });

    after(function () {
        return server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });
    // Hint on how to test PUT requests

    // useless tests to get coverage for echo and getStatic
    it("ECHO", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/echo/ServerWorking")
                .then(function (res: any) {
                    Log.trace("Here");
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.equal("ServerWorking...ServerWorking");
                }).catch(function (err) {
                    Log.trace("err");
                    expect.fail();
                    Log.error("Error" + err);
                });
        } catch (err) {
            Log.trace("Get Error");
        }
    });
    it("Error", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/test")
                .then(function (res: any) {
                    Log.trace("Here");
                    expect.fail();
                }).catch(function (err) {
                    Log.trace("err");
                    expect(err.status).to.be.equal(500);
                });
        } catch (err) {
            Log.trace("Get Error");
        }
    });
    it("PUT test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync("./test/data/courses.zip"), "courses.zip")
                .then(function (res: any) {
                    Log.trace("Dataset added");
                    expect(res.status).to.be.equal(200);
                }).catch(function (err) {
                    Log.trace("Error in adding dataset");
                    expect.fail();
                });
        } catch (err) {
            Log.trace("Put Error");
        }
    });
    it("PUT test for courses dataset - duplicate should fail", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync("./test/data/courses.zip"), "courses.zip")
                .then(function (res: any) {
                    Log.trace("Dataset added");
                    expect.fail();
                }).catch(function (err) {
                    Log.trace("Error in adding dataset");
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.trace("Put Error");
        }
    });
    it("PUT test for rooms dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .attach("body", fs.readFileSync("./test/data/rooms.zip"), "rooms.zip")
                .then(function (res: any) {
                    Log.trace("Dataset added");
                    expect(res.status).to.be.equal(200);
                }).catch(function (err) {
                    Log.trace("Error in adding dataset");
                    expect.fail();
                });
        } catch (err) {
            Log.trace("Put Error");
        }
    });
    it("PUT test for rooms dataset - duplicate should fail", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .attach("body", fs.readFileSync("./test/data/rooms.zip"), "rooms.zip")
                .then(function (res: any) {
                    Log.trace("Dataset added");
                    expect.fail();
                }).catch(function (err) {
                    Log.trace("Error in adding dataset");
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.trace("Put Error");
        }
    });
    it("GET test for rooms dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .get("/datasets")
                .then(function (res: any) {
                    Log.trace("Datasets listed");
                    let expected = [{
                        id: "courses",
                        kind: InsightDatasetKind.Courses,
                        numRows: 64612
                    }, {
                        id: "rooms",
                        kind: InsightDatasetKind.Rooms,
                        numRows: 364
                    }];
                    expect(res.status).to.be.equal(200);
                    expect(res.body).to.deep.equal({result: expected});
                }).catch(function (err) {
                    Log.trace("Error in adding dataset");
                    expect.fail();
                });
        } catch (err) {
            Log.trace("Get Error");
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
                .then(function (res: any) {
                    Log.trace("Performed Query");
                    expect(res.status).to.be.equal(200);
                    expect(res.body).to.deep.equal({result: [
                            {courses_dept: "econ", courses_id: "101", courses_avg: 61.96},
                            {courses_dept: "econ", courses_id: "101", courses_avg: 60.89},
                            {courses_dept: "econ", courses_id: "102", courses_avg: 61.04},
                            {courses_dept: "econ", courses_id: "221", courses_avg: 61.97}
                        ]
                    });
                })
                .catch(function (err) {
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            Log.trace("POST error");
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
                .then(function (res: any) {
                    Log.trace("Performed Query");
                    expect.fail();
                })
                .catch(function (err) {
                    Log.trace("Error in query");
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.trace("POST error");
        }
    });
    it("DELETE test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res: any) {
                    Log.trace("Dataset deleted");
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    expect.fail();
                });
        } catch (err) {
            Log.trace("Delete error");
        }
    });
    it("DELETE test for courses dataset - already removed", function () {
        try {
            return chai.request("http://localhost:4321")
                .del("/dataset/courses")
                .then(function (res: any) {
                    Log.trace("Dataset deleted");
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(404);
                });
        } catch (err) {
            Log.trace("Delete error");
        }
    });
});
