import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import {JSZipObject} from "jszip";
import Course from "../model/course";
import CourseClass from "../model/class";
import Dataset from "../model/dataset";
import Room from "../model/room";
import Building from "../model/building";
import InstanceOfType from "../model/InstanceOfType";
import Decimal from "decimal.js";
import ApplyObject from "../model/ApplyObject";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
// this is stupid

export default class InsightFacade implements IInsightFacade {
    public myDatasets = new Map<string, Dataset>();
    public notSearching = true;
    public queryingID = "";
    public currentDataset: Dataset = null;
    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let self = this;
        if (id === undefined || id === null || id === "") {
            return Promise.reject(new InsightError());
        }
        let buildingNames: string[] = [];
        const parse5 = require("parse5");
        const fs = require("fs-extra");
        let JSZip = require("jszip");
        if (self.myDatasets.has(id)) {
            return Promise.reject(new InsightError());
        }
        let zip = new JSZip();
        const promises: Array<Promise<string[]>> = [];
        const fulfilledPromises: any[] = [];
        return zip.loadAsync(content, {base64: true}).then(function () {
            if (kind === InsightDatasetKind.Courses) {
                zip.folder("courses").forEach(function (relativePath: string, file: JSZipObject) {
                    promises.push(zip.file(file.name).async("text").then(function (res: string) {
                        return self.parseJSON(res);
                    }));
                });
            } else if (kind === InsightDatasetKind.Rooms) {
                promises.push(zip.file("index.htm").async("text").then(function (res: string) {
                    const linkPromises: Array<Promise<string[]>> = [];
                    let document = parse5.parse(res);
                    let table = self.findNames(document, "tbody");
                    let myLinks = self.parseLinks(table[0]);
                    fs.ensureDirSync("./data/rooms");
                    fs.ensureDirSync("./data/rooms/" + id);
                    for (let link of myLinks) {
                        linkPromises.push(zip.file(link.slice(2)).async("string").then(function (room: string) {
                            let roomDoc = parse5.parse(room);
                            let body = self.findNames(roomDoc, "body");
                            let divs = self.getTableTag(body[0], "div");
                            let node = self.makeHeader(divs, "building-info");
                            let buildingInfo = self.makeHeader(node[0].childNodes, "field-content");
                            fs.ensureFileSync("./data/rooms/" +  id + "/" + buildingInfo[0].childNodes[0].value);
                            fs.writeFileSync("./data/rooms/" + id + "/" + buildingInfo[0].childNodes[0].value, room);
                            let roomsTable = self.findNames(roomDoc, "tbody");
                            try {
                                let rows = self.getTableTag(roomsTable[0], "tr");
                                return self.makeRoom(rows, buildingInfo);
                            } catch (e) {
                                return buildingInfo[0].childNodes[0].value;
                            }
                        }));
                    }
                    return Promise.all(linkPromises).then(function (res2: any) {
                        return res2;
                    });
                }));
            }
            return Promise.all(promises).then((result: any[]) => {
                if (InsightDatasetKind.Courses === kind) {
                    for (let r of result) {
                        if (r !== null) {
                            fulfilledPromises.push(r);
                        }
                    }
                    if (fulfilledPromises.length < 1) {
                        return new InsightError();
                    }
                    return self.createCourses(fulfilledPromises, fulfilledPromises.length, id, kind);
                } else if (InsightDatasetKind.Rooms === kind) {
                    let dataset = new Dataset(id, kind);
                    for (let b of result[0]) {
                        if (typeof b !== "string") {
                            let building = new Building(b);
                            dataset.typeMap.set(building.instanceOfType[0].ROOMS_FULLNAME, building);
                        } else {
                            let building = new Building([]);
                            dataset.typeMap.set(b, building);
                        }
                    }
                    dataset.numRows = self.getRows(dataset);
                    self.myDatasets.set(id, dataset);
                    let myArrayOfID: string[] = [];
                    self.myDatasets.forEach(function (value: Dataset, key: string) {
                        myArrayOfID.push(key);
                    });
                    return myArrayOfID;
                }
            });
        }).catch(function () {
            return Promise.reject(new InsightError());
        });
    }
    public getRows(dataset: Dataset) {
        let acc = 0;
        for (let building of dataset.typeMap.values()) {
            acc += building.instanceOfType.length;
        }
        return acc;
    }
    public makeRoom(rows: any, buildingInfo: any[]): Promise<any> {
        let self = this;
        const promises: Array<Promise<{}>> = [];
        for (let row of rows) {
            let td = self.getTableTag(row, "td");
            let room = new Room(td, buildingInfo);
            promises.push(self.finalCourse(room));
        }
        return Promise.all(promises).then(function (res: any) {
            return Promise.resolve(res);
        });
    }
    public finalCourse(room: Room) {
        return new Promise(function (resolve, reject) {
            let address = room.ROOMS_ADDRESS;
            let encodedAdress = encodeURI(address);
            let url = "http://cs310.ugrad.cs.ubc.ca:11316/api/v1/project_n3e1b_p5b1b/" + encodedAdress;
            let http = require("http");
            return http.get(url, function (res: any) {
                let rawData = "";
                res.on("data", (chunk: any) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        let lon: number = parsedData.lon;
                        let lat: number = parsedData.lat;
                        room.ROOMS_LAT = lat;
                        room.ROOMS_LON = lon;
                        resolve(room);
                        return;
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    }

    public makeHeader(body: any, lookingFor: string) {
        let self = this;
        let ourArray: any[] = [];
        for (let div of body) {
            try {
                for (let attr of div.attrs) {
                    if (attr.value === lookingFor) {
                        ourArray.push(div);
                    }
                }
            } catch (e) {
                //
            }
            if (div.childNodes !== undefined) {
                ourArray = ourArray.concat(self.makeHeader(div.childNodes, lookingFor));
            }
        }
        return ourArray;
    }
    public getTableTag(roomsTable: any, name: string) {
        let tableRows: any[] = [];
        for (let tableRow of roomsTable.childNodes) {
            if (tableRow.nodeName === name) {
                tableRows.push(tableRow);
            }
        }
        return tableRows;
    }
    public parseJSON(res: string) {
        try {
            return JSON.parse(res);
        } catch (e) {
            return null;
        }
    }
    public parseIndex(body: any, lookingFor: string, attr: number) {
        for (let node of body.childNodes) {
            try {
                if (node.attrs[attr].value === lookingFor) {
                    return node;
                }
            } catch (e) {
                //
            }
        }
    }
    public findNames(body: any, lookingFor: string) {
        let self = this;
        let ourArray: any[] = [];
        for (let node of body.childNodes) {
            try {
                if (node.nodeName === lookingFor) {
                    ourArray.push(node);
                }
            } catch (e) {
                //
            }
            if (node.childNodes !== undefined) {
                ourArray = ourArray.concat(self.findNames(node, lookingFor));
            }
        }
        return ourArray;
    }
    public parseLinks(table: any) {
        let self = this;
        let arrayOfLinks = [];
        let lookingFor = "";
        for (let node of table.childNodes) {
            try {
                if (node.nodeName === "tr") {
                    if (lookingFor === "") {
                        for (let n of node.childNodes) {
                            if (n.nodeName === "td") {
                                lookingFor = n.attrs[0].value;
                            }
                        }
                    }
                    let nameNode = self.parseIndex(node, lookingFor, 0);
                    for (let a of nameNode.childNodes) {
                        if (a.nodeName === "a") {
                            arrayOfLinks.push(a.attrs[0].value);
                        }
                    }
                }
            } catch (e) {
                // Do nothing
            }
        }
        return arrayOfLinks;
    }
    public createCourses(result: any, size: number, id: string, kind: InsightDatasetKind) {
        let self = this;
        let myArrayOfID: string[] = [];
        let newDataset = new Dataset(id, kind);
        const fs = require("fs-extra");
        for (let i = 0; i < size; i++) {
            // size is the number of courses (number of json files in zip)
            // a course class is the overall course which has a name and contains instances of that course
            try {
                let nameOfCourse = (result[i].result[0].Subject + result[i].result[0].Course).toUpperCase();
                let courseClass = new CourseClass(nameOfCourse);
                for (let c of result[i].result) {
                    try {
                        let course = new Course(c);
                        courseClass.instanceOfType.push(course);
                    } catch (err) {
                        //
                    }
                }
                if (courseClass.instanceOfType.length > 0) {
                    // add the course to all the courses in our dataset
                    fs.ensureDirSync("./data/courses/" + id);
                    newDataset.typeMap.set(courseClass.courseName, courseClass);
                    fs.ensureFileSync("./data/courses/" +  id + "/" + nameOfCourse);
                    fs.writeFileSync("./data/courses/" + id + "/" + nameOfCourse, JSON.stringify(result[i].result));
                    newDataset.numRows += courseClass.instanceOfType.length;
                } else {
                    //
                }
            } catch (err) {
                //
            }
        }
        // check if the course should be added (if it has at least one valid course)
        if (newDataset.typeMap.size < 1) {
            throw new InsightError();
        }
        // add the dataset to all my current datasets
        self.myDatasets.set(id, newDataset);
        self.myDatasets.forEach(function (value: Dataset, key: string) {
            myArrayOfID.push(key);
        });
        return myArrayOfID;
    }

    public removeDataset(id: string): Promise<string> {
        // Required to remove from disk
            // Required to remove from disk
        let self = this;
        const fs = require("fs-extra");
        if (id === "" || id === null || id === undefined) {
            return Promise.reject(new InsightError());
        }
        if (!self.myDatasets.has(id)) {
            return Promise.reject(new NotFoundError());
        }
        if (self.myDatasets.get(id).kind === InsightDatasetKind.Courses) {
            fs.removeSync("./data/courses/" + id);
            self.myDatasets.delete(id);
            return Promise.resolve(id);
        } else if (self.myDatasets.get(id).kind === InsightDatasetKind.Rooms) {
            fs.removeSync("./data/rooms/" + id);
            self.myDatasets.delete(id);
            return Promise.resolve(id);
        } else {
            return Promise.reject(new NotFoundError());
        }
    }

    public performQuery(query: any): Promise <any[]> {
        let self = this;
        if (query === null || query === undefined) {
            return Promise.reject(new InsightError());
        }
        if ((Object.keys(query).length) === 3) {
            if (!query.hasOwnProperty("TRANSFORMATIONS")) {
                return Promise.reject(new InsightError());
            }
        }
        if (query.hasOwnProperty("TRANSFORMATIONS")) {
            if (!query.TRANSFORMATIONS.hasOwnProperty("GROUP") ||
                !query.TRANSFORMATIONS.hasOwnProperty("APPLY")) {
                return Promise.reject(new InsightError());
            }
        }
        // Empty Options
        if (!(query.hasOwnProperty("WHERE")) || !(query.hasOwnProperty("OPTIONS")) ||
            !(query.OPTIONS.hasOwnProperty("COLUMNS"))) {
            return Promise.reject(new InsightError());
        }
        if (Object.keys(query.OPTIONS).length === 0) {
            return Promise.reject(new InsightError());
        }
        // Empty Columns
        if (Object.keys(query.OPTIONS.COLUMNS).length === 0) {
            return Promise.reject(new InsightError());
        }
        const columns = query.OPTIONS.COLUMNS;
        const options = query.OPTIONS;
        const order = query.OPTIONS.ORDER;
        let arrOfApply: any[] = [];
        if (query.hasOwnProperty("TRANSFORMATIONS")) {
            for (let app of query.TRANSFORMATIONS.APPLY) {
                if (arrOfApply.includes(Object.keys(app)[0])) {
                    return Promise.reject(new InsightError());
                }
                if (Object.keys(app)[0].includes("_")) {
                    return Promise.reject(new InsightError());
                }
                arrOfApply.push(Object.keys(app)[0]);
            }
        }
        if (order !== undefined) {
            if (Object.keys(query.OPTIONS.ORDER).length === 0) {
                return Promise.reject(new InsightError());
            }
        }
        try {
            if (query.hasOwnProperty("TRANSFORMATIONS")) {
                if (query.TRANSFORMATIONS.hasOwnProperty("GROUP")) {
                    let id = query.TRANSFORMATIONS.GROUP[0];
                    self.queryingID = id.split("_")[0];
                    self.currentDataset = self.myDatasets.get(self.queryingID);
                } else {
                    return Promise.reject(new InsightError());
                }
            } else {
                let datasetID: string = query.OPTIONS.COLUMNS[0];
                self.queryingID = datasetID.split("_")[0];
                self.currentDataset = self.myDatasets.get(self.queryingID);
            }
            let where = query.WHERE;
            let myDataset = self.myDatasets.get(self.queryingID);
            let datasetRows = self.myDatasets.get(self.queryingID).numRows;
            let res: any;
            if (Object.keys(where).length === 0 && datasetRows < 5000) {
                res = self.getAllFromDataset();
            } else {
                res = self.search(where);
            }
            if (res.length === 0) {
                return Promise.resolve([]);
            }
            let group: Map<string, any[]>;
            let apply: any;
            let sorted: any;
            if (query.TRANSFORMATIONS !== undefined) {
                group = self.doGrouping(query.TRANSFORMATIONS, res);
                apply = self.doApply(group, query.TRANSFORMATIONS);
                if (apply.includes(false)) {
                    return Promise.reject(new InsightError());
                }
                // use the course to get info
                let sortedNew;
                if (query.OPTIONS.ORDER !== undefined) {
                    if (query.OPTIONS.ORDER.hasOwnProperty("keys")) {
                        sortedNew = self.doSorting(apply, query.OPTIONS.ORDER, query.OPTIONS.ORDER.keys);
                    } else {
                        sortedNew = self.doSorting(apply, query.OPTIONS.ORDER, query.OPTIONS.ORDER);
                    }
                } else {
                    sortedNew = apply;
                }
                let finalResponse = self.doColumns(sortedNew, query.OPTIONS);
                if (finalResponse.includes(false)) {
                    return Promise.reject(new InsightError());
                }
                return Promise.resolve(finalResponse);
            }
            let finalRes = self.getCols(res as InstanceOfType[], query.OPTIONS);
            if (finalRes.length > 5000) {
                return Promise.reject(new InsightError());
            }
            return Promise.resolve(finalRes);
        } catch (error) {
            return Promise.reject(new InsightError());
        }
    }
    public doColumns(applyArray: ApplyObject[], options: any) {
        let finalRes = [];
        for (let instance of  applyArray) {
            let courseFinal: {} = instance.getResponse(options.COLUMNS);
            finalRes.push(JSON.parse(JSON.stringify(courseFinal)));
        }
        return finalRes;
    }
    // lol
    public doSorting(applyMap: ApplyObject[], order: any, orderKeys: any) {
        let self = this;
        let id = self.queryingID;
        let finalRes = [];
        if (order !== undefined) {
            if (order.keys.length === 0) {
                throw new InsightError();
            }
        }
        if (order.dir !== undefined) {
            let orderDown: boolean;
            if (order.dir === "UP") {
                orderDown = true;
            } else if (order.dir === "DOWN") {
                orderDown = false;
            } else  {
                throw new InsightError();
            }
            // Sort
            if (orderKeys[0].includes("_")) {
                let order1: string;
                for (let ord of applyMap[0].groupCriteria.keys()) {
                    if (orderKeys[0] === ord) {
                        order1 = ord;
                    }
                }
                applyMap.sort(function (a: ApplyObject, b: ApplyObject) {
                    if (a.groupCriteria.get(order1) !== b.groupCriteria.get(order1)) {
                        if ((a.groupCriteria.get(order1) < b.groupCriteria.get(order1)) === orderDown) {
                            return -1;
                        }
                        if ((a.groupCriteria.get(order1) > b.groupCriteria.get(order1) === orderDown)) {
                            return 1;
                        }
                    } else {
                        if (orderKeys.length > 1) {
                            let newSorted = self.doSorting([a, b], order, orderKeys.slice(1, ));
                            if ((newSorted[0] === a)) {
                                return -1;
                            } else {
                                return 1;
                            }
                        } else {
                            return 0;
                        }
                    }
                });
            } else {
                let order1: string;
                for (let ord of applyMap[0].apply.keys()) {
                    if (orderKeys[0] === ord) {
                        order1 = ord;
                    }
                }
                let key2423 = orderKeys[0];
                for (let ord2 of applyMap[0].groupCriteria.keys()) {
                    if (orderKeys[0] === ord2) {
                        order1 = ord2;
                    }
                }
                applyMap.sort(function (a: ApplyObject, b: ApplyObject) {
                    if (a.apply.get(order1) !== b.apply.get(order1)) {
                        if ((a.apply.get(order1) < b.apply.get(order1)) === orderDown) {
                            return -1;
                        }
                        if ((a.apply.get(order1) > b.apply.get(order1) === orderDown)) {
                            return 1;
                        }
                    } else {
                        if (orderKeys.length > 1) {
                            let newSorted = self.doSorting([a, b], order, orderKeys.slice(1, ));
                            if ((newSorted[0] === a)) {
                                return -1;
                            } else {
                                return 1;
                            }
                        } else {
                            return 0;
                        }
                    }
                });
            }
        } else {
            if (order.includes("_")) {
                applyMap.sort(function (a: ApplyObject, b: ApplyObject) {
                    if (a.groupCriteria.get(order) < b.groupCriteria.get(order)) {
                        return -1;
                    }
                    if ((a.groupCriteria.get(order) > b.groupCriteria.get(order))) {
                        return 1;
                    }
                    if ((a.groupCriteria.get(order) === b.groupCriteria.get(order))) {
                        return 0;
                    }
                });
            } else {
                applyMap.sort(function (a: ApplyObject, b: ApplyObject) {
                    if (a.apply.get(order) < b.apply.get(order)) {
                        return -1;
                    }
                    if ((a.apply.get(order) > b.apply.get(order))) {
                        return 1;
                    }
                    if ((a.apply.get(order) === b.apply.get(order))) {
                        return 0;
                    }
                });
            }
        }
        return applyMap;
    }
    // added
    public doGrouping(transformation: any, res: any[]) {
        let self = this;
        let id = self.queryingID;
        let attributes = [id + "_dept", id + "_id", id + "_instructor", id + "_title", id + "_pass"];
        attributes.push(id + "_fail", id + "_audit", id + "_uuid", id + "_year", id + "_avg");
        attributes.push(id + "_fullname", id + "_shortname", id + "_number", id + "_name");
        attributes.push(id + "_address", id + "_lat", id + "_lon", id + "_seats", id + "_type");
        attributes.push(id + "_furniture", id + "_href");
        let groups = new Map<string, any[]>();
        let group = transformation.GROUP;
        if (self.currentDataset.kind === InsightDatasetKind.Rooms) {
            for (let room of res as Room[]) {
                let values: any[] = [];
                for (let grouping of group) {
                    if (!attributes.includes(grouping.toLowerCase())) {
                        throw new InsightError();
                    }
                    grouping = grouping.toUpperCase();
                    values.push(room[grouping as keyof Room]);
                }
                let keys = values.toString();
                if (groups.has(keys)) {
                    groups.get(keys).push(room);
                } else {
                    groups.set(keys, [room]);
                }
            }
        } else {
            for (let room of res as Course[]) {
                let values: any[] = [];
                for (let grouping of group) {
                    grouping = grouping.toUpperCase();
                    values.push(room[grouping as keyof Course]);
                    if (!attributes.includes(grouping.toLowerCase())) {
                        throw new InsightError();
                    }
                }
                let keys = values.toString();
                if (groups.has(keys)) {
                    groups.get(keys).push(room);
                } else {
                    groups.set(keys, [room]);
                }
            }
        }
        return groups;
    }
    public doApply(groups: Map<string, any[]>, trans: any): any {
        let self = this;
        let response: any[] = [];
        let dataset = self.currentDataset;
        let count = 0;
        for (let apply of trans.APPLY) {
            let overallResponse: any[] = [];
            let vals = Object.values(apply);
            let keyLookingArray =  Object.values(vals[0]);
            let operationInArray =  Object.keys(vals[0]);
            let operation = operationInArray[0];
            let keyLookingForInObject = keyLookingArray[0];
            let keyFromApplyArray = Object.keys(apply);
            let keyFromApply = keyFromApplyArray[0];
            groups.forEach(function (value: any[], key: string, map: Map<string, any[]>) {
                switch (operation) {
                    case "MAX": {
                        let currentMax = -10000000;
                        for (let room of value) {
                            let val;
                            if (dataset.kind === InsightDatasetKind.Rooms) {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Room];
                            } else {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Course];
                            }
                            if (typeof val !== "number" && keyLookingForInObject.toUpperCase() !== "ROOMS_SEATS"
                                && keyLookingForInObject.toUpperCase() !== "ROOMS_LAT" &&
                                keyLookingForInObject.toUpperCase() !== "ROOMS_LON") {
                                response.push(false);
                            }
                            if (Number(val) > currentMax) {
                                currentMax = Number(val);
                            }
                        }
                        // value[0].newCols()
                        if (count === 0) {
                            let newObject = new ApplyObject(value[0], keyFromApply, trans.GROUP, currentMax,
                                dataset.kind);
                            response.push(newObject);
                        } else {
                            for (let applyOf of response) {
                                if (applyOf.objectTo === value[0]) {
                                    applyOf.apply.set(keyFromApply, currentMax);
                                }
                            }
                        }
                        break;
                    }
                    case "MIN" : {
                        let currentMin = 1000000000000000;
                        for (let room of value) {
                            let val;
                            if (dataset.kind === InsightDatasetKind.Rooms) {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Room];
                            } else {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Course];
                            }
                            if (typeof val !== "number" && keyLookingForInObject.toUpperCase() !== "ROOMS_SEATS"
                                && keyLookingForInObject.toUpperCase() !== "ROOMS_LAT" &&
                                keyLookingForInObject.toUpperCase() !== "ROOMS_LON") {
                                response.push(false);
                            }
                            if (Number(val) < currentMin) {
                                currentMin = Number(val);
                            }
                        }
                        if (count === 0) {
                            let newObject = new ApplyObject(value[0], keyFromApply, trans.GROUP, currentMin,
                                dataset.kind);
                            response.push(newObject);
                        } else {
                            for (let applyOf of response) {
                                if (applyOf.objectTo === value[0]) {
                                    applyOf.apply.set(keyFromApply, currentMin);
                                }
                            }
                        }
                        break;
                    }
                    case "SUM": {
                        let currentSum = 0;
                        for (let room of value) {
                            let val;
                            if (dataset.kind === InsightDatasetKind.Rooms) {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Room];
                            } else {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Course];
                            }
                            if (typeof val !== "number" && keyLookingForInObject.toUpperCase() !== "ROOMS_SEATS"
                                && keyLookingForInObject.toUpperCase() !== "ROOMS_LAT" &&
                                keyLookingForInObject.toUpperCase() !== "ROOMS_LON") {
                                response.push(false);
                            }
                            currentSum += Number(val);
                        }
                        if (count === 0) {
                            let newObject = new ApplyObject(value[0], keyFromApply, trans.GROUP,
                                Number(currentSum.toFixed(2)), dataset.kind);
                            response.push(newObject);
                        } else {
                            for (let applyOf of response) {
                                if (applyOf.objectTo === value[0]) {
                                    applyOf.apply.set(keyFromApply, Number(currentSum.toFixed(2)));
                                }
                            }
                        }
                        break;
                    }
                    case "COUNT": {
                        // response.push(value.length);
                        let currentArray: any[] = [];
                        let currentCount = 0;
                        for (let room of value) {
                            let val;
                            if (dataset.kind === InsightDatasetKind.Rooms) {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Room];
                            } else {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Course];
                            }
                            if (!(currentArray.includes(val))) {
                                currentCount++;
                                currentArray.push(val);
                            }
                        }
                        if (count === 0) {
                            let newObject = new ApplyObject(value[0], keyFromApply, trans.GROUP, currentCount,
                                dataset.kind);
                            response.push(newObject);
                        } else {
                            for (let applyOf of response) {
                                if (applyOf.objectTo === value[0]) {
                                    applyOf.apply.set(keyFromApply, currentCount);
                                }
                            }
                        }
                        break;
                    }
                    case "AVG": {
                        let total = new Decimal(0);
                        for (let room of value) {
                            let val;
                            if (dataset.kind === InsightDatasetKind.Rooms) {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Room];
                            } else {
                                let thisKey = (keyLookingForInObject as string).toUpperCase();
                                val = room[thisKey as keyof Course];
                            }
                            if (typeof val !== "number" && keyLookingForInObject.toUpperCase() !== "ROOMS_SEATS"
                                && keyLookingForInObject.toUpperCase() !== "ROOMS_LAT" &&
                                keyLookingForInObject.toUpperCase() !== "ROOMS_LON") {
                                response.push(false);
                            }
                            total = Decimal.add(total, new Decimal(val));
                        }
                        let average = total.toNumber() / value.length;
                        if (count === 0) {
                            let newObject = new ApplyObject(value[0], keyFromApply, trans.GROUP,
                                Number(average.toFixed(2)), dataset.kind);
                            response.push(newObject);
                        } else {
                            for (let applyOf of response) {
                                if (applyOf.objectTo === value[0]) {
                                    applyOf.apply.set(keyFromApply, Number(average.toFixed(2)));
                                }
                            }
                        }
                        break;
                    } default: {
                        throw new InsightError();
                }
                }
            });
            count++;
        }
        return response;
    }
    public getAllFromDataset() {
        let self = this;
        let result: InstanceOfType[] = [];
        let dataset = self.myDatasets.get(self.queryingID);
        for (let typeIn of dataset.typeMap.values()) {
            for (let instance of typeIn.instanceOfType) {
                result.push(instance);
            }
        }
        return result;
    }
    public getCols(allCourses: InstanceOfType[], options: any) {
        let self = this;
        let allInstances;
        let id = self.myDatasets.get(self.queryingID);
        if (id.kind === InsightDatasetKind.Courses) {
            allInstances = allCourses as Course[];
            // let courses: Course[] = courses1;
        } else {
            allInstances = allCourses as Room[];
        }
        let finalRes: any[] = [];
        let columns = options.COLUMNS;
        if (options.ORDER !== undefined) {
            allInstances = this.getFilter(allInstances, options.ORDER, options.ORDER.keys);
        }
        if (self.currentDataset.kind === InsightDatasetKind.Courses) {
            for (let instance of (allInstances as Course[])) {
                let courseFinal = instance.getCourseResponse(columns);
                finalRes.push(JSON.parse(JSON.stringify(courseFinal)));
            }
        }
        if (self.currentDataset.kind === InsightDatasetKind.Rooms) {
            for (let instance of (allInstances as Room[])) {
                let courseFinal = instance.getCourseResponse(columns);
                finalRes.push(JSON.parse(JSON.stringify(courseFinal)));
            }
        }
        return finalRes;
    }
    public getFilter(coursesOriginal: InstanceOfType[], order1: any | any, orderKeys: any) {
        let self = this;
        let id = self.queryingID;
        let numericalOrder = [id + "_avg", id + "_pass", id + "_fail", id + "_audit", id + "_year"];
        numericalOrder.push(id + "_dept", id + "_instructor", id + "_uuid", id + "_title", id + "_id");
        numericalOrder.push(id + "_lat", id + "_lon", id + "_seats");
        numericalOrder.push(id + "_fullname", id + "_shortname", id + "_number", id + "_name");
        numericalOrder.push(id + "_address", id + "_type", id + "_furniture", id + "_href");
        if (order1.dir === undefined) {
            for (let filter of numericalOrder) {
                if (order1 === filter) {
                    if (self.currentDataset.kind === InsightDatasetKind.Rooms) {
                        return self.getFilterRooms(coursesOriginal, order1, orderKeys);
                    }
                    let order3 = "courses_" + order1.split("_")[1];
                    let order2: any = order3.toUpperCase();
                    let order: (keyof Course) = order2;
                    coursesOriginal.sort(function (a: Course, b: Course): number {
                        if (a[order] < b[order]) {
                            return -1;
                        }
                        if (a[order] > b[order]) {
                            return 1;
                        }
                        return 0;
                    });
                }
            }
        } else {
            let orderDown: boolean;
            if (order1.dir !== "DOWN") {
                orderDown = true;
            } else {
                orderDown = false;
            }
            if (self.currentDataset.kind === InsightDatasetKind.Rooms) {
                return self.getFilterRooms(coursesOriginal, order1, orderKeys);
            }
            let order1Key = orderKeys[0];
            let order3 = "courses_" + order1Key.split("_")[1];
            if (!numericalOrder.includes(order3)) {
                throw new InsightError();
            }
            let order2: any = order3.toUpperCase();
            let order: (keyof Course) = order2;
            coursesOriginal.sort(function (a: Course, b: Course): number {
                if (a[order] !== b[order]) {
                    if ((a[order] < b[order]) === orderDown) {
                        return -1;
                    }
                    if ((a[order] > b[order]) === orderDown) {
                        return 1;
                    }
                } else {
                    if (orderKeys.length > 1) {
                        let newSorted = self.getFilter([a, b], order1, orderKeys.slice(1, ));
                        if ((newSorted[0] === a)) {
                            return -1;
                        } else {
                            return 1;
                        }
                    } else {
                        return 0;
                    }
                }
            });
            return coursesOriginal;
        }
        return coursesOriginal;
    }
    public getFilterRooms(coursesOriginal: InstanceOfType[], order1: string | any, orderKeys: any) {
        let self = this;
        coursesOriginal = coursesOriginal as Room[];
        if (order1.dir === undefined) {
            let order3 = "rooms_" + order1.split("_")[1];
            let order2: any = order3.toUpperCase();
            let order: (keyof Room) = order2;
            coursesOriginal.sort(function (a: Room, b: Room): number {
                if (a[order] < b[order]) {
                    return -1;
                }
                if (a[order] > b[order]) {
                    return 1;
                }
                return 0;
            });
            return coursesOriginal;
        } else {
            let orderDown: boolean;
            if (order1.dir !== "DOWN") {
                orderDown = true;
            } else {
                orderDown = false;
            }
            let order3 = "rooms_" + orderKeys[0].split("_")[1];
            let order2: any = order3.toUpperCase();
            let order: (keyof Room) = order2;
            coursesOriginal.sort(function (a: Room, b: Room): number {
                if (a[order] !== b[order]) {
                    if ((a[order] < b[order]) === orderDown) {
                        return -1;
                    }
                    if ((a[order] > b[order]) === orderDown) {
                        return 1;
                    }
                } else {
                    if (orderKeys.length > 1) {
                        let newSorted = self.getFilterRooms([a, b], order1, orderKeys.slice(1, ));
                        if ((newSorted[0] === a)) {
                            return -1;
                        } else {
                            return 1;
                        }
                    } else {
                        return 0;
                    }
                }
                // Hello
            });
            return coursesOriginal;
        }
    }
    // You && with the recursive functions where each recursive function returns just the math of the comparator
    public search(where: any) {
        let self = this;
        let myArrayOfLogic = ["AND", "OR", "GT", "EQ", "LT", "IS", "NOT"];
        let myArrayCompartor = ["LT", "GT", "EQ", "IS", "NOT"];
        let onlyLogic = ["AND", "OR"];
        for (let l of myArrayOfLogic) {
            if (where[l] !== undefined) {
                if (onlyLogic.includes(l)) {
                    // It's logical
                    switch (l) {
                        case "AND": {
                            return self.withAnd(where[l]);
                        }
                        case "OR": {
                            return self.withOr(where[l]);
                        }
                    }
                } else {
                    // you return the search
                    for (let c in myArrayCompartor) {
                        if (myArrayCompartor.includes(l)) {
                            switch (l) {
                                case "LT": {
                                    return self.searchLT(where[l]);
                                }
                                case "GT": {
                                    return self.searchGT(where[l]);
                                }
                                case "EQ": {
                                    return self.searchEQ(where[l]);
                                }
                                case "IS": {
                                    return self.searchIS(where[l]);
                                }
                                case "NOT": {
                                    return self.searchNOT(where[l]);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    public searchNOT(withNOT: any): InstanceOfType[] {
        let self = this;
        self.notSearching = !self.notSearching;
        let notArray =  self.search(withNOT);
        self.notSearching = true;
        return notArray as InstanceOfType[];
    }
    public searchGT(attr: any) {
        let self = this;
        let otherID: string;
        if (self.currentDataset.kind === InsightDatasetKind.Courses) {
            otherID = "courses";
        } else {
            otherID = "rooms";
        }
        let returnCourses: InstanceOfType[] = [];
        // lookingFor[0] contains the course_avg or whatever and lookingFor[1] contains the value 98
        let lookingFor = self.searchAttribute(attr);
        let myStringKey = otherID + "_" + lookingFor[0].split("_")[1];
        let mKey: any = myStringKey.toUpperCase();
        let otherKey = mKey as (keyof Course | keyof Room);
        if ((typeof lookingFor[1]) !== "number") {
            return new InsightError();
        }
        let dataset = self.myDatasets.get(self.queryingID);
        for (let typeIn of dataset.typeMap.values()) {
            for (let instance of typeIn.instanceOfType) {
                let comp;
                if (self.currentDataset.kind === InsightDatasetKind.Courses) {
                    instance = instance as Course;
                    otherKey = otherKey as (keyof Course);
                    comp = instance[otherKey];
                } else {
                    instance = instance as Room;
                    otherKey = otherKey as (keyof Room);
                    comp = instance[otherKey];
                }
                if (otherKey === "ROOMS_SEATS") {
                    comp = Number(comp);
                }
                if (!(typeof comp === "number")) {
                    return new InsightError();
                }
                if ((comp > lookingFor[1]) === self.notSearching) {
                    if (!returnCourses.includes(instance)) {
                        returnCourses.push(instance);
                    }
                }
            }
        }
        return returnCourses;
    }
    public searchLT(attr: any) {
        let self = this;
        let otherID: string;
        if (self.currentDataset.kind === InsightDatasetKind.Courses) {
            otherID = "courses";
        } else {
            otherID = "rooms";
        }
        let id = self.queryingID;
        // return attr;
        // let returnCourses: Array<[string, string]> = [];
        let returnCourses: InstanceOfType[] = [];
        // lookingFor[0] contains the course_avg or whatever and lookingFor[1] contains the value 98
        let lookingFor = self.searchAttribute(attr);
        let myStringKey = otherID + "_" + lookingFor[0].split("_")[1];
        let mKey: any = myStringKey.toUpperCase();
        let otherKey: (keyof Course | keyof Room) = mKey;
        if ((typeof lookingFor[1]) !== "number") {
            return new InsightError();
        }
        let dataset = self.myDatasets.get(self.queryingID);
        for (let courseClass of dataset.typeMap.values()) {
            for (let instance of courseClass.instanceOfType) {
                let comp;
                if (self.currentDataset.kind === InsightDatasetKind.Courses) {
                    instance = instance as Course;
                    otherKey = otherKey as (keyof Course);
                    comp = instance[otherKey];
                } else {
                    instance = instance as Room;
                    otherKey = otherKey as (keyof Room);
                    comp = instance[otherKey];
                }
                if (otherKey === "ROOMS_SEATS") {
                    comp = Number(comp);
                }
                if (!(typeof comp === "number")) {
                    return new InsightError();
                }
                if ((comp < lookingFor[1]) === self.notSearching) {
                    if (!returnCourses.includes(instance)) {
                        returnCourses.push(instance);
                    }
                }
            }
        }
        return returnCourses;
    }
    public searchIS(attr: any) {
        let self = this;
        let otherID: string;
        if (self.currentDataset.kind === InsightDatasetKind.Courses) {
            otherID = "courses";
        } else {
            otherID = "rooms";
        }
        let id = self.queryingID;
        // return attr;
        // let returnCourses: Array<[string, string]> = [];
        let returnCourses: InstanceOfType[] = [];
        // lookingFor[0] contains the course_avg or whatever and lookingFor[1] contains the value 98
        let lookingFor = self.searchAttribute(attr);
        let myStringKey = otherID + "_" + lookingFor[0].split("_")[1];
        let keyId = "COURSES";
        let mKey: any = myStringKey.toUpperCase();
        let otherKey: (keyof Course | keyof Room) = mKey;
        if (otherKey !== keyId + "_ID" && otherKey !== keyId + "_UUID") {
            if (!isNaN(lookingFor[1]) && lookingFor[1] !== "") {
                return new InsightError();
            }
        }
        let dataset = self.myDatasets.get(id);
        let searchingFor: string = lookingFor[1];
        if (searchingFor.includes("*")) {
            return self.isRegex(searchingFor, otherKey, dataset, returnCourses);
        }
        for (let courseClass of dataset.typeMap.values()) {
            for (let instance of courseClass.instanceOfType) {
                let comp;
                if (self.currentDataset.kind === InsightDatasetKind.Courses) {
                    instance = instance as Course;
                    otherKey = otherKey as (keyof Course);
                    comp = instance[otherKey];
                } else {
                    instance = instance as Room;
                    otherKey = otherKey as (keyof Room);
                    comp = instance[otherKey];
                }
                if (!(typeof comp === "string") && otherKey !== keyId + "_UUID") {
                    return new InsightError();
                }
                let courseString: string;
                if (otherKey === keyId + "_UUID") {
                    courseString = comp.toString();
                } else {
                    courseString = (comp as string);
                }
                if (((courseString === lookingFor[1])) === self.notSearching) {
                    if (!returnCourses.includes(instance)) {
                        returnCourses.push(instance);
                    }
                }
            }
        }
        return returnCourses;
    }
    public isRegex(myString: string, otherKey: (keyof Course | keyof Room), dataset: Dataset,
                   returnCourses: InstanceOfType[]) {
        let self = this;
        let id = self.queryingID;
        let keyId = id.toUpperCase();
        let beforeAndAfter: string[] = myString.split("*");
        if (beforeAndAfter.length === 2) {
            if (beforeAndAfter[0] === "") {
                if (beforeAndAfter.length > 2) {
                    return new InsightError();
                }
                let chars = beforeAndAfter[1].length;
                for (let courseClass of dataset.typeMap.values()) {
                    for (let instance of courseClass.instanceOfType) {
                        let comp;
                        if (self.currentDataset.kind === InsightDatasetKind.Courses) {
                            instance = instance as Course;
                            otherKey = otherKey as (keyof Course);
                            comp = instance[otherKey];
                        } else {
                            instance = instance as Room;
                            otherKey = otherKey as (keyof Room);
                            comp = instance[otherKey];
                        }
                        if (!(typeof comp === "string") && otherKey !== keyId + "_UUID") {
                            return new InsightError();
                        }
                        let courseString: string;
                        if (otherKey === keyId + "_UUID") {
                            courseString = comp.toString();
                        } else {
                            courseString = (comp as string);
                        }
                        let len = courseString.length;
                        if ((courseString.includes(beforeAndAfter[1], len - chars) === self.notSearching)) {
                            if (!returnCourses.includes(instance)) {
                                returnCourses.push(instance);
                            }
                        }
                    }
                }
            } else if (beforeAndAfter[1] === "") {
                if (beforeAndAfter.length > 2) {
                    return new InsightError();
                }
                let chars = beforeAndAfter[0].length;
                for (let courseClass of dataset.typeMap.values()) {
                    for (let instance of courseClass.instanceOfType) {
                        let comp;
                        if (self.currentDataset.kind === InsightDatasetKind.Courses) {
                            instance = instance as Course;
                            otherKey = otherKey as (keyof Course);
                            comp = instance[otherKey];
                        } else {
                            instance = instance as Room;
                            otherKey = otherKey as (keyof Room);
                            comp = instance[otherKey];
                        }
                        if (!(typeof comp === "string") && otherKey !== keyId + "_UUID") {
                            return new InsightError();
                        }
                        let courseString: string;
                        if (otherKey === keyId + "_UUID") {
                            courseString = comp.toString();
                        } else {
                            courseString = (comp as string);
                        }
                        if (((courseString.substring(0, chars)) === beforeAndAfter[0]) === self.notSearching) {
                            if (!returnCourses.includes(instance)) {
                                returnCourses.push(instance);
                            }
                        }
                    }
                }
            } else {
                return new InsightError();
            }
        } else if (beforeAndAfter.length === 3 && beforeAndAfter[0] === "" && beforeAndAfter[2] === "") {
            for (let courseClass of dataset.typeMap.values()) {
                for (let instance of courseClass.instanceOfType) {
                    let comp;
                    if (self.currentDataset.kind === InsightDatasetKind.Courses) {
                        instance = instance as Course;
                        otherKey = otherKey as (keyof Course);
                        comp = instance[otherKey];
                    } else {
                        instance = instance as Room;
                        otherKey = otherKey as (keyof Room);
                        comp = instance[otherKey];
                    }
                    if (!(typeof comp === "string") && otherKey !== keyId + "_UUID") {
                        return new InsightError();
                    }
                    let courseString: string;
                    if (otherKey === keyId + "_UUID") {
                        courseString = comp.toString();
                    } else {
                        courseString = (comp as string);
                    }
                    if (((courseString.includes(beforeAndAfter[1]) === self.notSearching))) {
                        if (!returnCourses.includes(instance)) {
                            returnCourses.push(instance);
                        }
                    }
                }
            }
        } else {
            return new InsightError();
        }
        return returnCourses;
    }
    public searchEQ(attr: any) {
        let self = this;
        let otherID: string;
        if (self.currentDataset.kind === InsightDatasetKind.Courses) {
            otherID = "courses";
        } else {
            otherID = "rooms";
        }
        let id = self.queryingID;
        // return attr;
        // let returnCourses: Array<[string, string]> = [];
        let returnCourses: InstanceOfType[] = [];
        // lookingFor[0] contains the course_avg or whatever and lookingFor[1] contains the value 98
        let lookingFor = self.searchAttribute(attr);
        let myStringKey = otherID + "_" + lookingFor[0].split("_")[1];
        let mKey: any = myStringKey.toUpperCase();
        let otherKey: (keyof Course | keyof Room) = mKey;
        if ((typeof lookingFor[1]) !== "number") {
            return new InsightError();
        }
        let dataset = self.myDatasets.get(self.queryingID);
        for (let courseClass of dataset.typeMap.values()) {
            for (let instance of courseClass.instanceOfType) {
                let comp;
                if (self.currentDataset.kind === InsightDatasetKind.Courses) {
                    instance = instance as Course;
                    otherKey = otherKey as (keyof Course);
                    comp = instance[otherKey];
                } else {
                    instance = instance as Room;
                    otherKey = otherKey as (keyof Room);
                    comp = instance[otherKey];
                }
                if (otherKey === "ROOMS_SEATS") {
                    comp = Number(comp);
                }
                if (!(typeof comp === "number")) {
                    return new InsightError();
                }
                if ((comp === lookingFor[1]) === self.notSearching) {
                    if (!returnCourses.includes(instance)) {
                        returnCourses.push(instance);
                    }
                }
            }
        }
        return returnCourses;
    }
    public searchAttribute(attr: any) {
        let self = this;
        let id = self.queryingID;
        let attributes = [id + "_dept", id + "_id", id + "_instructor", id + "_title", id + "_pass"];
        attributes.push(id + "_fail", id + "_audit", id + "_uuid", id + "_year", id + "_avg");
        attributes.push(id + "_fullname", id + "_shortname", id + "_number", id + "_name");
        attributes.push(id + "_address", id + "_lat", id + "_lon", id + "_seats", id + "_type");
        attributes.push(id + "_furniture", id + "_href");
        for (let a of attributes) {
            if (attr[a] !== undefined) {
                return [a, attr[a]];
            }
        }
    }
    public withAnd(withinAnd: any[]) {
        if (withinAnd.length < 1) {
            return new InsightError();
        }
        let self = this;
        let myCount = new Map<InstanceOfType, number>();
        let otherArray: any[] = [];
        let andArray: InstanceOfType[] = [];
        for (let member of withinAnd) {
            otherArray.push(self.search(member));
        }
        for (let member of otherArray) {
            for (let name of member) {
                if (myCount.has(name)) {
                    myCount.set(name, myCount.get(name) + 1);
                } else {
                    myCount.set(name, 1);
                }
            }
        }
        myCount.forEach(function (value: number, key: InstanceOfType, map: Map<InstanceOfType, number>) {
            if (value === otherArray.length) {
                if (!andArray.includes(key)) {
                    andArray.push(key);
                }
            }
        });
        return andArray;
    }
    public withOr(withinOR: any[]) {
        if (withinOR.length < 1) {
            return new InsightError();
        }
        let self = this;
        let otherArray: any = [];
        let orArray: InstanceOfType[] = [];
        if (withinOR.length === 0) {
            return new InsightError();
        }
        for (let member of withinOR) {
            otherArray.push(self.search(member));
        }
        for (let member of otherArray) {
            for (let name of member) {
                if (!orArray.includes(name)) {
                    orArray.push(name);
                }
            }
        }
        return orArray;
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let thisArray: InsightDataset[] = [];
        this.myDatasets.forEach(function (value: Dataset, key: string) {
            let dataset: InsightDataset = {
                id: key,
                kind: value.kind,
                numRows: value.numRows,
            };
            thisArray.push(dataset);
        });
        Log.test("lol");
        Log.trace("lol");
        Log.info("lol");
        Log.error("lol");
        Log.warn("lol");
        return Promise.resolve(thisArray);
    }
}
