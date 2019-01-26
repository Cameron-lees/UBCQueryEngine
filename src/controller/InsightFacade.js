"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const IInsightFacade_1 = require("./IInsightFacade");
const course_1 = require("../model/course");
const class_1 = require("../model/class");
const dataset_1 = require("../model/dataset");
const room_1 = require("../model/room");
const building_1 = require("../model/building");
const decimal_js_1 = require("decimal.js");
const ApplyObject_1 = require("../model/ApplyObject");
class InsightFacade {
    constructor() {
        this.myDatasets = new Map();
        this.notSearching = true;
        this.queryingID = "";
        this.currentDataset = null;
        Util_1.default.trace("InsightFacadeImpl::init()");
    }
    addDataset(id, content, kind) {
        let self = this;
        if (id === undefined || id === null || id === "") {
            return Promise.reject(new IInsightFacade_1.InsightError());
        }
        let buildingNames = [];
        const parse5 = require("parse5");
        const fs = require("fs-extra");
        let JSZip = require("jszip");
        if (self.myDatasets.has(id)) {
            return Promise.reject(new IInsightFacade_1.InsightError());
        }
        let zip = new JSZip();
        const promises = [];
        const fulfilledPromises = [];
        return zip.loadAsync(content, { base64: true }).then(function () {
            if (kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                zip.folder("courses").forEach(function (relativePath, file) {
                    promises.push(zip.file(file.name).async("text").then(function (res) {
                        return self.parseJSON(res);
                    }));
                });
            }
            else if (kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                promises.push(zip.file("index.htm").async("text").then(function (res) {
                    const linkPromises = [];
                    let document = parse5.parse(res);
                    let table = self.findNames(document, "tbody");
                    let myLinks = self.parseLinks(table[0]);
                    fs.ensureDirSync("./data/rooms");
                    fs.ensureDirSync("./data/rooms/" + id);
                    for (let link of myLinks) {
                        linkPromises.push(zip.file(link.slice(2)).async("string").then(function (room) {
                            let roomDoc = parse5.parse(room);
                            let body = self.findNames(roomDoc, "body");
                            let divs = self.getTableTag(body[0], "div");
                            let node = self.makeHeader(divs, "building-info");
                            let buildingInfo = self.makeHeader(node[0].childNodes, "field-content");
                            fs.ensureFileSync("./data/rooms/" + id + "/" + buildingInfo[0].childNodes[0].value);
                            fs.writeFileSync("./data/rooms/" + id + "/" + buildingInfo[0].childNodes[0].value, room);
                            let roomsTable = self.findNames(roomDoc, "tbody");
                            try {
                                let rows = self.getTableTag(roomsTable[0], "tr");
                                return self.makeRoom(rows, buildingInfo);
                            }
                            catch (e) {
                                return buildingInfo[0].childNodes[0].value;
                            }
                        }));
                    }
                    return Promise.all(linkPromises).then(function (res2) {
                        return res2;
                    });
                }));
            }
            return Promise.all(promises).then((result) => {
                if (IInsightFacade_1.InsightDatasetKind.Courses === kind) {
                    for (let r of result) {
                        if (r !== null) {
                            fulfilledPromises.push(r);
                        }
                    }
                    if (fulfilledPromises.length < 1) {
                        return new IInsightFacade_1.InsightError();
                    }
                    return self.createCourses(fulfilledPromises, fulfilledPromises.length, id, kind);
                }
                else if (IInsightFacade_1.InsightDatasetKind.Rooms === kind) {
                    let dataset = new dataset_1.default(id, kind);
                    for (let b of result[0]) {
                        if (typeof b !== "string") {
                            let building = new building_1.default(b);
                            dataset.typeMap.set(building.instanceOfType[0].ROOMS_FULLNAME, building);
                        }
                        else {
                            let building = new building_1.default([]);
                            dataset.typeMap.set(b, building);
                        }
                    }
                    dataset.numRows = self.getRows(dataset);
                    self.myDatasets.set(id, dataset);
                    let myArrayOfID = [];
                    self.myDatasets.forEach(function (value, key) {
                        myArrayOfID.push(key);
                    });
                    return myArrayOfID;
                }
            });
        }).catch(function () {
            return Promise.reject(new IInsightFacade_1.InsightError());
        });
    }
    getRows(dataset) {
        let acc = 0;
        for (let building of dataset.typeMap.values()) {
            acc += building.instanceOfType.length;
        }
        return acc;
    }
    makeRoom(rows, buildingInfo) {
        let self = this;
        const promises = [];
        for (let row of rows) {
            let td = self.getTableTag(row, "td");
            let room = new room_1.default(td, buildingInfo);
            promises.push(self.finalCourse(room));
        }
        return Promise.all(promises).then(function (res) {
            return Promise.resolve(res);
        });
    }
    finalCourse(room) {
        return new Promise(function (resolve, reject) {
            let address = room.ROOMS_ADDRESS;
            let encodedAdress = encodeURI(address);
            let url = "http://cs310.ugrad.cs.ubc.ca:11316/api/v1/project_n3e1b_p5b1b/" + encodedAdress;
            let http = require("http");
            return http.get(url, function (res) {
                let rawData = "";
                res.on("data", (chunk) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        let lon = parsedData.lon;
                        let lat = parsedData.lat;
                        room.ROOMS_LAT = lat;
                        room.ROOMS_LON = lon;
                        resolve(room);
                        return;
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
        });
    }
    makeHeader(body, lookingFor) {
        let self = this;
        let ourArray = [];
        for (let div of body) {
            try {
                for (let attr of div.attrs) {
                    if (attr.value === lookingFor) {
                        ourArray.push(div);
                    }
                }
            }
            catch (e) {
            }
            if (div.childNodes !== undefined) {
                ourArray = ourArray.concat(self.makeHeader(div.childNodes, lookingFor));
            }
        }
        return ourArray;
    }
    getTableTag(roomsTable, name) {
        let tableRows = [];
        for (let tableRow of roomsTable.childNodes) {
            if (tableRow.nodeName === name) {
                tableRows.push(tableRow);
            }
        }
        return tableRows;
    }
    parseJSON(res) {
        try {
            return JSON.parse(res);
        }
        catch (e) {
            return null;
        }
    }
    parseIndex(body, lookingFor, attr) {
        for (let node of body.childNodes) {
            try {
                if (node.attrs[attr].value === lookingFor) {
                    return node;
                }
            }
            catch (e) {
            }
        }
    }
    findNames(body, lookingFor) {
        let self = this;
        let ourArray = [];
        for (let node of body.childNodes) {
            try {
                if (node.nodeName === lookingFor) {
                    ourArray.push(node);
                }
            }
            catch (e) {
            }
            if (node.childNodes !== undefined) {
                ourArray = ourArray.concat(self.findNames(node, lookingFor));
            }
        }
        return ourArray;
    }
    parseLinks(table) {
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
            }
            catch (e) {
            }
        }
        return arrayOfLinks;
    }
    createCourses(result, size, id, kind) {
        let self = this;
        let myArrayOfID = [];
        let newDataset = new dataset_1.default(id, kind);
        const fs = require("fs-extra");
        for (let i = 0; i < size; i++) {
            try {
                let nameOfCourse = (result[i].result[0].Subject + result[i].result[0].Course).toUpperCase();
                let courseClass = new class_1.default(nameOfCourse);
                for (let c of result[i].result) {
                    try {
                        let course = new course_1.default(c);
                        courseClass.instanceOfType.push(course);
                    }
                    catch (err) {
                    }
                }
                if (courseClass.instanceOfType.length > 0) {
                    fs.ensureDirSync("./data/courses/" + id);
                    newDataset.typeMap.set(courseClass.courseName, courseClass);
                    fs.ensureFileSync("./data/courses/" + id + "/" + nameOfCourse);
                    fs.writeFileSync("./data/courses/" + id + "/" + nameOfCourse, JSON.stringify(result[i].result));
                    newDataset.numRows += courseClass.instanceOfType.length;
                }
                else {
                }
            }
            catch (err) {
            }
        }
        if (newDataset.typeMap.size < 1) {
            throw new IInsightFacade_1.InsightError();
        }
        self.myDatasets.set(id, newDataset);
        self.myDatasets.forEach(function (value, key) {
            myArrayOfID.push(key);
        });
        return myArrayOfID;
    }
    removeDataset(id) {
        let self = this;
        const fs = require("fs-extra");
        if (id === "" || id === null || id === undefined) {
            return Promise.reject(new IInsightFacade_1.InsightError());
        }
        if (!self.myDatasets.has(id)) {
            return Promise.reject(new IInsightFacade_1.NotFoundError());
        }
        if (self.myDatasets.get(id).kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            fs.removeSync("./data/courses/" + id);
            self.myDatasets.delete(id);
            return Promise.resolve(id);
        }
        else if (self.myDatasets.get(id).kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
            fs.removeSync("./data/rooms/" + id);
            self.myDatasets.delete(id);
            return Promise.resolve(id);
        }
        else {
            return Promise.reject(new IInsightFacade_1.NotFoundError());
        }
    }
    performQuery(query) {
        let self = this;
        if (query === null || query === undefined) {
            return Promise.reject(new IInsightFacade_1.InsightError());
        }
        if ((Object.keys(query).length) === 3) {
            if (!query.hasOwnProperty("TRANSFORMATIONS")) {
                return Promise.reject(new IInsightFacade_1.InsightError());
            }
        }
        if (query.hasOwnProperty("TRANSFORMATIONS")) {
            if (!query.TRANSFORMATIONS.hasOwnProperty("GROUP") ||
                !query.TRANSFORMATIONS.hasOwnProperty("APPLY")) {
                return Promise.reject(new IInsightFacade_1.InsightError());
            }
        }
        if (!(query.hasOwnProperty("WHERE")) || !(query.hasOwnProperty("OPTIONS")) ||
            !(query.OPTIONS.hasOwnProperty("COLUMNS"))) {
            return Promise.reject(new IInsightFacade_1.InsightError());
        }
        if (Object.keys(query.OPTIONS).length === 0) {
            return Promise.reject(new IInsightFacade_1.InsightError());
        }
        if (Object.keys(query.OPTIONS.COLUMNS).length === 0) {
            return Promise.reject(new IInsightFacade_1.InsightError());
        }
        const columns = query.OPTIONS.COLUMNS;
        const options = query.OPTIONS;
        const order = query.OPTIONS.ORDER;
        let arrOfApply = [];
        if (query.hasOwnProperty("TRANSFORMATIONS")) {
            for (let app of query.TRANSFORMATIONS.APPLY) {
                if (arrOfApply.includes(Object.keys(app)[0])) {
                    return Promise.reject(new IInsightFacade_1.InsightError());
                }
                if (Object.keys(app)[0].includes("_")) {
                    return Promise.reject(new IInsightFacade_1.InsightError());
                }
                arrOfApply.push(Object.keys(app)[0]);
            }
        }
        if (order !== undefined) {
            if (Object.keys(query.OPTIONS.ORDER).length === 0) {
                return Promise.reject(new IInsightFacade_1.InsightError());
            }
        }
        try {
            if (query.hasOwnProperty("TRANSFORMATIONS")) {
                if (query.TRANSFORMATIONS.hasOwnProperty("GROUP")) {
                    let id = query.TRANSFORMATIONS.GROUP[0];
                    self.queryingID = id.split("_")[0];
                    self.currentDataset = self.myDatasets.get(self.queryingID);
                }
                else {
                    return Promise.reject(new IInsightFacade_1.InsightError());
                }
            }
            else {
                let datasetID = query.OPTIONS.COLUMNS[0];
                self.queryingID = datasetID.split("_")[0];
                self.currentDataset = self.myDatasets.get(self.queryingID);
            }
            let where = query.WHERE;
            let myDataset = self.myDatasets.get(self.queryingID);
            let datasetRows = self.myDatasets.get(self.queryingID).numRows;
            let res;
            if (Object.keys(where).length === 0 && datasetRows < 5000) {
                res = self.getAllFromDataset();
            }
            else {
                res = self.search(where);
            }
            if (res.length === 0) {
                return Promise.resolve([]);
            }
            let group;
            let apply;
            let sorted;
            if (query.TRANSFORMATIONS !== undefined) {
                group = self.doGrouping(query.TRANSFORMATIONS, res);
                apply = self.doApply(group, query.TRANSFORMATIONS);
                if (apply.includes(false)) {
                    return Promise.reject(new IInsightFacade_1.InsightError());
                }
                let sortedNew;
                if (query.OPTIONS.ORDER !== undefined) {
                    if (query.OPTIONS.ORDER.hasOwnProperty("keys")) {
                        sortedNew = self.doSorting(apply, query.OPTIONS.ORDER, query.OPTIONS.ORDER.keys);
                    }
                    else {
                        sortedNew = self.doSorting(apply, query.OPTIONS.ORDER, query.OPTIONS.ORDER);
                    }
                }
                else {
                    sortedNew = apply;
                }
                let finalResponse = self.doColumns(sortedNew, query.OPTIONS);
                if (finalResponse.includes(false)) {
                    return Promise.reject(new IInsightFacade_1.InsightError());
                }
                return Promise.resolve(finalResponse);
            }
            let finalRes = self.getCols(res, query.OPTIONS);
            if (finalRes.length > 5000) {
                return Promise.reject(new IInsightFacade_1.InsightError());
            }
            return Promise.resolve(finalRes);
        }
        catch (error) {
            return Promise.reject(new IInsightFacade_1.InsightError());
        }
    }
    doColumns(applyArray, options) {
        let finalRes = [];
        for (let instance of applyArray) {
            let courseFinal = instance.getResponse(options.COLUMNS);
            finalRes.push(JSON.parse(JSON.stringify(courseFinal)));
        }
        return finalRes;
    }
    doSorting(applyMap, order, orderKeys) {
        let self = this;
        let id = self.queryingID;
        let finalRes = [];
        if (order !== undefined) {
            if (order.keys.length === 0) {
                throw new IInsightFacade_1.InsightError();
            }
        }
        if (order.dir !== undefined) {
            let orderDown;
            if (order.dir === "UP") {
                orderDown = true;
            }
            else if (order.dir === "DOWN") {
                orderDown = false;
            }
            else {
                throw new IInsightFacade_1.InsightError();
            }
            if (orderKeys[0].includes("_")) {
                let order1;
                for (let ord of applyMap[0].groupCriteria.keys()) {
                    if (orderKeys[0] === ord) {
                        order1 = ord;
                    }
                }
                applyMap.sort(function (a, b) {
                    if (a.groupCriteria.get(order1) !== b.groupCriteria.get(order1)) {
                        if ((a.groupCriteria.get(order1) < b.groupCriteria.get(order1)) === orderDown) {
                            return -1;
                        }
                        if ((a.groupCriteria.get(order1) > b.groupCriteria.get(order1) === orderDown)) {
                            return 1;
                        }
                    }
                    else {
                        if (orderKeys.length > 1) {
                            let newSorted = self.doSorting([a, b], order, orderKeys.slice(1));
                            if ((newSorted[0] === a)) {
                                return -1;
                            }
                            else {
                                return 1;
                            }
                        }
                        else {
                            return 0;
                        }
                    }
                });
            }
            else {
                let order1;
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
                applyMap.sort(function (a, b) {
                    if (a.apply.get(order1) !== b.apply.get(order1)) {
                        if ((a.apply.get(order1) < b.apply.get(order1)) === orderDown) {
                            return -1;
                        }
                        if ((a.apply.get(order1) > b.apply.get(order1) === orderDown)) {
                            return 1;
                        }
                    }
                    else {
                        if (orderKeys.length > 1) {
                            let newSorted = self.doSorting([a, b], order, orderKeys.slice(1));
                            if ((newSorted[0] === a)) {
                                return -1;
                            }
                            else {
                                return 1;
                            }
                        }
                        else {
                            return 0;
                        }
                    }
                });
            }
        }
        else {
            if (order.includes("_")) {
                applyMap.sort(function (a, b) {
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
            }
            else {
                applyMap.sort(function (a, b) {
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
    doGrouping(transformation, res) {
        let self = this;
        let id = self.queryingID;
        let attributes = [id + "_dept", id + "_id", id + "_instructor", id + "_title", id + "_pass"];
        attributes.push(id + "_fail", id + "_audit", id + "_uuid", id + "_year", id + "_avg");
        attributes.push(id + "_fullname", id + "_shortname", id + "_number", id + "_name");
        attributes.push(id + "_address", id + "_lat", id + "_lon", id + "_seats", id + "_type");
        attributes.push(id + "_furniture", id + "_href");
        let groups = new Map();
        let group = transformation.GROUP;
        if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
            for (let room of res) {
                let values = [];
                for (let grouping of group) {
                    if (!attributes.includes(grouping.toLowerCase())) {
                        throw new IInsightFacade_1.InsightError();
                    }
                    grouping = grouping.toUpperCase();
                    values.push(room[grouping]);
                }
                let keys = values.toString();
                if (groups.has(keys)) {
                    groups.get(keys).push(room);
                }
                else {
                    groups.set(keys, [room]);
                }
            }
        }
        else {
            for (let room of res) {
                let values = [];
                for (let grouping of group) {
                    grouping = grouping.toUpperCase();
                    values.push(room[grouping]);
                    if (!attributes.includes(grouping.toLowerCase())) {
                        throw new IInsightFacade_1.InsightError();
                    }
                }
                let keys = values.toString();
                if (groups.has(keys)) {
                    groups.get(keys).push(room);
                }
                else {
                    groups.set(keys, [room]);
                }
            }
        }
        return groups;
    }
    doApply(groups, trans) {
        let self = this;
        let response = [];
        let dataset = self.currentDataset;
        let count = 0;
        for (let apply of trans.APPLY) {
            let overallResponse = [];
            let vals = Object.values(apply);
            let keyLookingArray = Object.values(vals[0]);
            let operationInArray = Object.keys(vals[0]);
            let operation = operationInArray[0];
            let keyLookingForInObject = keyLookingArray[0];
            let keyFromApplyArray = Object.keys(apply);
            let keyFromApply = keyFromApplyArray[0];
            groups.forEach(function (value, key, map) {
                switch (operation) {
                    case "MAX": {
                        let currentMax = -10000000;
                        for (let room of value) {
                            let val;
                            if (dataset.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
                            }
                            else {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
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
                        if (count === 0) {
                            let newObject = new ApplyObject_1.default(value[0], keyFromApply, trans.GROUP, currentMax, dataset.kind);
                            response.push(newObject);
                        }
                        else {
                            for (let applyOf of response) {
                                if (applyOf.objectTo === value[0]) {
                                    applyOf.apply.set(keyFromApply, currentMax);
                                }
                            }
                        }
                        break;
                    }
                    case "MIN": {
                        let currentMin = 1000000000000000;
                        for (let room of value) {
                            let val;
                            if (dataset.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
                            }
                            else {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
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
                            let newObject = new ApplyObject_1.default(value[0], keyFromApply, trans.GROUP, currentMin, dataset.kind);
                            response.push(newObject);
                        }
                        else {
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
                            if (dataset.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
                            }
                            else {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
                            }
                            if (typeof val !== "number" && keyLookingForInObject.toUpperCase() !== "ROOMS_SEATS"
                                && keyLookingForInObject.toUpperCase() !== "ROOMS_LAT" &&
                                keyLookingForInObject.toUpperCase() !== "ROOMS_LON") {
                                response.push(false);
                            }
                            currentSum += Number(val);
                        }
                        if (count === 0) {
                            let newObject = new ApplyObject_1.default(value[0], keyFromApply, trans.GROUP, Number(currentSum.toFixed(2)), dataset.kind);
                            response.push(newObject);
                        }
                        else {
                            for (let applyOf of response) {
                                if (applyOf.objectTo === value[0]) {
                                    applyOf.apply.set(keyFromApply, Number(currentSum.toFixed(2)));
                                }
                            }
                        }
                        break;
                    }
                    case "COUNT": {
                        let currentArray = [];
                        let currentCount = 0;
                        for (let room of value) {
                            let val;
                            if (dataset.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
                            }
                            else {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
                            }
                            if (!(currentArray.includes(val))) {
                                currentCount++;
                                currentArray.push(val);
                            }
                        }
                        if (count === 0) {
                            let newObject = new ApplyObject_1.default(value[0], keyFromApply, trans.GROUP, currentCount, dataset.kind);
                            response.push(newObject);
                        }
                        else {
                            for (let applyOf of response) {
                                if (applyOf.objectTo === value[0]) {
                                    applyOf.apply.set(keyFromApply, currentCount);
                                }
                            }
                        }
                        break;
                    }
                    case "AVG": {
                        let total = new decimal_js_1.default(0);
                        for (let room of value) {
                            let val;
                            if (dataset.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
                            }
                            else {
                                let thisKey = keyLookingForInObject.toUpperCase();
                                val = room[thisKey];
                            }
                            if (typeof val !== "number" && keyLookingForInObject.toUpperCase() !== "ROOMS_SEATS"
                                && keyLookingForInObject.toUpperCase() !== "ROOMS_LAT" &&
                                keyLookingForInObject.toUpperCase() !== "ROOMS_LON") {
                                response.push(false);
                            }
                            total = decimal_js_1.default.add(total, new decimal_js_1.default(val));
                        }
                        let average = total.toNumber() / value.length;
                        if (count === 0) {
                            let newObject = new ApplyObject_1.default(value[0], keyFromApply, trans.GROUP, Number(average.toFixed(2)), dataset.kind);
                            response.push(newObject);
                        }
                        else {
                            for (let applyOf of response) {
                                if (applyOf.objectTo === value[0]) {
                                    applyOf.apply.set(keyFromApply, Number(average.toFixed(2)));
                                }
                            }
                        }
                        break;
                    }
                    default: {
                        throw new IInsightFacade_1.InsightError();
                    }
                }
            });
            count++;
        }
        return response;
    }
    getAllFromDataset() {
        let self = this;
        let result = [];
        let dataset = self.myDatasets.get(self.queryingID);
        for (let typeIn of dataset.typeMap.values()) {
            for (let instance of typeIn.instanceOfType) {
                result.push(instance);
            }
        }
        return result;
    }
    getCols(allCourses, options) {
        let self = this;
        let allInstances;
        let id = self.myDatasets.get(self.queryingID);
        if (id.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            allInstances = allCourses;
        }
        else {
            allInstances = allCourses;
        }
        let finalRes = [];
        let columns = options.COLUMNS;
        if (options.ORDER !== undefined) {
            allInstances = this.getFilter(allInstances, options.ORDER, options.ORDER.keys);
        }
        if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            for (let instance of allInstances) {
                let courseFinal = instance.getCourseResponse(columns);
                finalRes.push(JSON.parse(JSON.stringify(courseFinal)));
            }
        }
        if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
            for (let instance of allInstances) {
                let courseFinal = instance.getCourseResponse(columns);
                finalRes.push(JSON.parse(JSON.stringify(courseFinal)));
            }
        }
        return finalRes;
    }
    getFilter(coursesOriginal, order1, orderKeys) {
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
                    if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                        return self.getFilterRooms(coursesOriginal, order1, orderKeys);
                    }
                    let order3 = "courses_" + order1.split("_")[1];
                    let order2 = order3.toUpperCase();
                    let order = order2;
                    coursesOriginal.sort(function (a, b) {
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
        }
        else {
            let orderDown;
            if (order1.dir !== "DOWN") {
                orderDown = true;
            }
            else {
                orderDown = false;
            }
            if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                return self.getFilterRooms(coursesOriginal, order1, orderKeys);
            }
            let order1Key = orderKeys[0];
            let order3 = "courses_" + order1Key.split("_")[1];
            if (!numericalOrder.includes(order3)) {
                throw new IInsightFacade_1.InsightError();
            }
            let order2 = order3.toUpperCase();
            let order = order2;
            coursesOriginal.sort(function (a, b) {
                if (a[order] !== b[order]) {
                    if ((a[order] < b[order]) === orderDown) {
                        return -1;
                    }
                    if ((a[order] > b[order]) === orderDown) {
                        return 1;
                    }
                }
                else {
                    if (orderKeys.length > 1) {
                        let newSorted = self.getFilter([a, b], order1, orderKeys.slice(1));
                        if ((newSorted[0] === a)) {
                            return -1;
                        }
                        else {
                            return 1;
                        }
                    }
                    else {
                        return 0;
                    }
                }
            });
            return coursesOriginal;
        }
        return coursesOriginal;
    }
    getFilterRooms(coursesOriginal, order1, orderKeys) {
        let self = this;
        coursesOriginal = coursesOriginal;
        if (order1.dir === undefined) {
            let order3 = "rooms_" + order1.split("_")[1];
            let order2 = order3.toUpperCase();
            let order = order2;
            coursesOriginal.sort(function (a, b) {
                if (a[order] < b[order]) {
                    return -1;
                }
                if (a[order] > b[order]) {
                    return 1;
                }
                return 0;
            });
            return coursesOriginal;
        }
        else {
            let orderDown;
            if (order1.dir !== "DOWN") {
                orderDown = true;
            }
            else {
                orderDown = false;
            }
            let order3 = "rooms_" + orderKeys[0].split("_")[1];
            let order2 = order3.toUpperCase();
            let order = order2;
            coursesOriginal.sort(function (a, b) {
                if (a[order] !== b[order]) {
                    if ((a[order] < b[order]) === orderDown) {
                        return -1;
                    }
                    if ((a[order] > b[order]) === orderDown) {
                        return 1;
                    }
                }
                else {
                    if (orderKeys.length > 1) {
                        let newSorted = self.getFilterRooms([a, b], order1, orderKeys.slice(1));
                        if ((newSorted[0] === a)) {
                            return -1;
                        }
                        else {
                            return 1;
                        }
                    }
                    else {
                        return 0;
                    }
                }
            });
            return coursesOriginal;
        }
    }
    search(where) {
        let self = this;
        let myArrayOfLogic = ["AND", "OR", "GT", "EQ", "LT", "IS", "NOT"];
        let myArrayCompartor = ["LT", "GT", "EQ", "IS", "NOT"];
        let onlyLogic = ["AND", "OR"];
        for (let l of myArrayOfLogic) {
            if (where[l] !== undefined) {
                if (onlyLogic.includes(l)) {
                    switch (l) {
                        case "AND": {
                            return self.withAnd(where[l]);
                        }
                        case "OR": {
                            return self.withOr(where[l]);
                        }
                    }
                }
                else {
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
    searchNOT(withNOT) {
        let self = this;
        self.notSearching = !self.notSearching;
        let notArray = self.search(withNOT);
        self.notSearching = true;
        return notArray;
    }
    searchGT(attr) {
        let self = this;
        let otherID;
        if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            otherID = "courses";
        }
        else {
            otherID = "rooms";
        }
        let returnCourses = [];
        let lookingFor = self.searchAttribute(attr);
        let myStringKey = otherID + "_" + lookingFor[0].split("_")[1];
        let mKey = myStringKey.toUpperCase();
        let otherKey = mKey;
        if ((typeof lookingFor[1]) !== "number") {
            return new IInsightFacade_1.InsightError();
        }
        let dataset = self.myDatasets.get(self.queryingID);
        for (let typeIn of dataset.typeMap.values()) {
            for (let instance of typeIn.instanceOfType) {
                let comp;
                if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                    instance = instance;
                    otherKey = otherKey;
                    comp = instance[otherKey];
                }
                else {
                    instance = instance;
                    otherKey = otherKey;
                    comp = instance[otherKey];
                }
                if (otherKey === "ROOMS_SEATS") {
                    comp = Number(comp);
                }
                if (!(typeof comp === "number")) {
                    return new IInsightFacade_1.InsightError();
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
    searchLT(attr) {
        let self = this;
        let otherID;
        if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            otherID = "courses";
        }
        else {
            otherID = "rooms";
        }
        let id = self.queryingID;
        let returnCourses = [];
        let lookingFor = self.searchAttribute(attr);
        let myStringKey = otherID + "_" + lookingFor[0].split("_")[1];
        let mKey = myStringKey.toUpperCase();
        let otherKey = mKey;
        if ((typeof lookingFor[1]) !== "number") {
            return new IInsightFacade_1.InsightError();
        }
        let dataset = self.myDatasets.get(self.queryingID);
        for (let courseClass of dataset.typeMap.values()) {
            for (let instance of courseClass.instanceOfType) {
                let comp;
                if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                    instance = instance;
                    otherKey = otherKey;
                    comp = instance[otherKey];
                }
                else {
                    instance = instance;
                    otherKey = otherKey;
                    comp = instance[otherKey];
                }
                if (otherKey === "ROOMS_SEATS") {
                    comp = Number(comp);
                }
                if (!(typeof comp === "number")) {
                    return new IInsightFacade_1.InsightError();
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
    searchIS(attr) {
        let self = this;
        let otherID;
        if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            otherID = "courses";
        }
        else {
            otherID = "rooms";
        }
        let id = self.queryingID;
        let returnCourses = [];
        let lookingFor = self.searchAttribute(attr);
        let myStringKey = otherID + "_" + lookingFor[0].split("_")[1];
        let keyId = "COURSES";
        let mKey = myStringKey.toUpperCase();
        let otherKey = mKey;
        if (otherKey !== keyId + "_ID" && otherKey !== keyId + "_UUID") {
            if (!isNaN(lookingFor[1]) && lookingFor[1] !== "") {
                return new IInsightFacade_1.InsightError();
            }
        }
        let dataset = self.myDatasets.get(id);
        let searchingFor = lookingFor[1];
        if (searchingFor.includes("*")) {
            return self.isRegex(searchingFor, otherKey, dataset, returnCourses);
        }
        for (let courseClass of dataset.typeMap.values()) {
            for (let instance of courseClass.instanceOfType) {
                let comp;
                if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                    instance = instance;
                    otherKey = otherKey;
                    comp = instance[otherKey];
                }
                else {
                    instance = instance;
                    otherKey = otherKey;
                    comp = instance[otherKey];
                }
                if (!(typeof comp === "string") && otherKey !== keyId + "_UUID") {
                    return new IInsightFacade_1.InsightError();
                }
                let courseString;
                if (otherKey === keyId + "_UUID") {
                    courseString = comp.toString();
                }
                else {
                    courseString = comp;
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
    isRegex(myString, otherKey, dataset, returnCourses) {
        let self = this;
        let id = self.queryingID;
        let keyId = id.toUpperCase();
        let beforeAndAfter = myString.split("*");
        if (beforeAndAfter.length === 2) {
            if (beforeAndAfter[0] === "") {
                if (beforeAndAfter.length > 2) {
                    return new IInsightFacade_1.InsightError();
                }
                let chars = beforeAndAfter[1].length;
                for (let courseClass of dataset.typeMap.values()) {
                    for (let instance of courseClass.instanceOfType) {
                        let comp;
                        if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                            instance = instance;
                            otherKey = otherKey;
                            comp = instance[otherKey];
                        }
                        else {
                            instance = instance;
                            otherKey = otherKey;
                            comp = instance[otherKey];
                        }
                        if (!(typeof comp === "string") && otherKey !== keyId + "_UUID") {
                            return new IInsightFacade_1.InsightError();
                        }
                        let courseString;
                        if (otherKey === keyId + "_UUID") {
                            courseString = comp.toString();
                        }
                        else {
                            courseString = comp;
                        }
                        let len = courseString.length;
                        if ((courseString.includes(beforeAndAfter[1], len - chars) === self.notSearching)) {
                            if (!returnCourses.includes(instance)) {
                                returnCourses.push(instance);
                            }
                        }
                    }
                }
            }
            else if (beforeAndAfter[1] === "") {
                if (beforeAndAfter.length > 2) {
                    return new IInsightFacade_1.InsightError();
                }
                let chars = beforeAndAfter[0].length;
                for (let courseClass of dataset.typeMap.values()) {
                    for (let instance of courseClass.instanceOfType) {
                        let comp;
                        if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                            instance = instance;
                            otherKey = otherKey;
                            comp = instance[otherKey];
                        }
                        else {
                            instance = instance;
                            otherKey = otherKey;
                            comp = instance[otherKey];
                        }
                        if (!(typeof comp === "string") && otherKey !== keyId + "_UUID") {
                            return new IInsightFacade_1.InsightError();
                        }
                        let courseString;
                        if (otherKey === keyId + "_UUID") {
                            courseString = comp.toString();
                        }
                        else {
                            courseString = comp;
                        }
                        if (((courseString.substring(0, chars)) === beforeAndAfter[0]) === self.notSearching) {
                            if (!returnCourses.includes(instance)) {
                                returnCourses.push(instance);
                            }
                        }
                    }
                }
            }
            else {
                return new IInsightFacade_1.InsightError();
            }
        }
        else if (beforeAndAfter.length === 3 && beforeAndAfter[0] === "" && beforeAndAfter[2] === "") {
            for (let courseClass of dataset.typeMap.values()) {
                for (let instance of courseClass.instanceOfType) {
                    let comp;
                    if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                        instance = instance;
                        otherKey = otherKey;
                        comp = instance[otherKey];
                    }
                    else {
                        instance = instance;
                        otherKey = otherKey;
                        comp = instance[otherKey];
                    }
                    if (!(typeof comp === "string") && otherKey !== keyId + "_UUID") {
                        return new IInsightFacade_1.InsightError();
                    }
                    let courseString;
                    if (otherKey === keyId + "_UUID") {
                        courseString = comp.toString();
                    }
                    else {
                        courseString = comp;
                    }
                    if (((courseString.includes(beforeAndAfter[1]) === self.notSearching))) {
                        if (!returnCourses.includes(instance)) {
                            returnCourses.push(instance);
                        }
                    }
                }
            }
        }
        else {
            return new IInsightFacade_1.InsightError();
        }
        return returnCourses;
    }
    searchEQ(attr) {
        let self = this;
        let otherID;
        if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            otherID = "courses";
        }
        else {
            otherID = "rooms";
        }
        let id = self.queryingID;
        let returnCourses = [];
        let lookingFor = self.searchAttribute(attr);
        let myStringKey = otherID + "_" + lookingFor[0].split("_")[1];
        let mKey = myStringKey.toUpperCase();
        let otherKey = mKey;
        if ((typeof lookingFor[1]) !== "number") {
            return new IInsightFacade_1.InsightError();
        }
        let dataset = self.myDatasets.get(self.queryingID);
        for (let courseClass of dataset.typeMap.values()) {
            for (let instance of courseClass.instanceOfType) {
                let comp;
                if (self.currentDataset.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                    instance = instance;
                    otherKey = otherKey;
                    comp = instance[otherKey];
                }
                else {
                    instance = instance;
                    otherKey = otherKey;
                    comp = instance[otherKey];
                }
                if (otherKey === "ROOMS_SEATS") {
                    comp = Number(comp);
                }
                if (!(typeof comp === "number")) {
                    return new IInsightFacade_1.InsightError();
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
    searchAttribute(attr) {
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
    withAnd(withinAnd) {
        if (withinAnd.length < 1) {
            return new IInsightFacade_1.InsightError();
        }
        let self = this;
        let myCount = new Map();
        let otherArray = [];
        let andArray = [];
        for (let member of withinAnd) {
            otherArray.push(self.search(member));
        }
        for (let member of otherArray) {
            for (let name of member) {
                if (myCount.has(name)) {
                    myCount.set(name, myCount.get(name) + 1);
                }
                else {
                    myCount.set(name, 1);
                }
            }
        }
        myCount.forEach(function (value, key, map) {
            if (value === otherArray.length) {
                if (!andArray.includes(key)) {
                    andArray.push(key);
                }
            }
        });
        return andArray;
    }
    withOr(withinOR) {
        if (withinOR.length < 1) {
            return new IInsightFacade_1.InsightError();
        }
        let self = this;
        let otherArray = [];
        let orArray = [];
        if (withinOR.length === 0) {
            return new IInsightFacade_1.InsightError();
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
    listDatasets() {
        let thisArray = [];
        this.myDatasets.forEach(function (value, key) {
            let dataset = {
                id: key,
                kind: value.kind,
                numRows: value.numRows,
            };
            thisArray.push(dataset);
        });
        Util_1.default.test("lol");
        Util_1.default.trace("lol");
        Util_1.default.info("lol");
        Util_1.default.error("lol");
        Util_1.default.warn("lol");
        return Promise.resolve(thisArray);
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map