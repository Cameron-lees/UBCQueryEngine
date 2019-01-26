/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function() {
    var query = {};
    var finalQuery = {};
    // TODO: implement!
    var panel = document.getElementsByClassName("tab-panel active")[0];
    var id = panel.id.slice(4);
    buildWhereQuery(query, panel, id);
    buildColumnsQuery(query, panel, id);
    buildTransformationsQuery(query, panel, id);
    finalQuery['query'] = query;
    return query;
};



function buildTransformationsQuery(query, panel, id) {
    var transformations=  {};
    var transformationsGroup;
    var controlGroup;
    if (id === "courses") {
        controlGroup = document.getElementsByClassName("form-group groups")[0];
        transformationsGroup = document.getElementsByClassName("form-group transformations")[0];
    } else {
        controlGroup = document.getElementsByClassName("form-group groups")[1];
        transformationsGroup = document.getElementsByClassName("form-group transformations")[1];
    }
    var groups = [];
    var inputs = controlGroup.getElementsByTagName("input");
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].checked) {
            if (keys.includes(inputs[i].value)) {
                groups.push(id + "_" + inputs[i].value);
            } else {
                groups.push(inputs[i].value);
            }
        }
    }
    // i.e, group values : ["avg", "instructor", "year"]
    if (groups.length > 0) {
        transformations["GROUP"] = groups;
    }
    var transformationsArray = getApply(transformationsGroup, id);
    if (transformationsArray.length > 0) {
        transformations["APPLY"] = transformationsArray;
    }
        // Add transformation to query
    if (groups.length > 0 || transformationsArray.length > 0) {
        query["TRANSFORMATIONS"] = transformations;
    }
}

function getApply(transformationGroup, id) {
    var appliesArray = [];
    var container = transformationGroup.getElementsByClassName("transformations-container")[0];
    var applies = container.getElementsByClassName("control-group transformation");
    for (var i = 0; i < container.childElementCount ; i++) {
        var nameOfApply = {};
        var insideApply = {};
        var term = applies[i].getElementsByClassName("control term")[0];
        // What you want to call the transformation. i,e maxSum ..
        var actualTerm = term.getElementsByTagName("input")[0].value;
        // COUNT, AVG ...
        var operator = applies[i].getElementsByClassName("control operators")[0];
        var actualOperator = getFromContainer(operator);
        // field: audit, average, number ...
        var field = applies[i].getElementsByClassName("control fields")[0];
        var actualField = id + "_" + getFromContainer(field);
        insideApply[actualOperator] = actualField;
        nameOfApply[actualTerm] = insideApply;
        appliesArray.push(nameOfApply);
    }
    return appliesArray;
}
function buildColumnsQuery(query, panel, id) {
    var options=  {};
    var orderValue = {};
    var controlGroup;
    var order;
    var controlOrder;
    if (id === "courses") {
        controlGroup = document.getElementsByClassName("form-group columns")[0];
        order = document.getElementsByClassName("form-group order")[0];
        controlOrder = document.getElementById("courses-order");
    } else {
        controlGroup = document.getElementsByClassName("form-group columns")[1];
        order = document.getElementsByClassName("form-group order")[1];
        controlOrder = document.getElementById("rooms-order");
    }
    var columns = [];
    var inputs = controlGroup.getElementsByTagName("input");
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].checked) {
            if (keys.includes(inputs[i].value)) {
                columns.push(id + "_" + inputs[i].value);
            } else {
                columns.push(inputs[i].value);
            }
        }
    }
    // i.e, column values : ["avg", "instructor", "year"]
    options["COLUMNS"] = columns;
    // still need to add functionality for ascending and descending
    // get order returns array the selected order with id pre appended
    var finalOrder = getOrder(order, id);
    if (finalOrder.length > 0) {
        if (controlOrder.checked) {
            orderValue["dir"] = "DOWN";
        } else {
            orderValue["dir"] = "UP";
        }
        orderValue["keys"] = finalOrder;
        options["ORDER"] = orderValue;

    }
    // Add options to query
    query["OPTIONS"] = options;
}

function getOrder(order, id) {
    var orderArray = [];
    var options = order.getElementsByTagName("option");
    for (var i = 0; i < options.length; i++) {
        if (options[i].selected) {
            if (keys.includes(options[i].value)) {
                orderArray.push(id + "_" + options[i].value);
            } else {
                orderArray.push(options[i].value);
            }
        }
    }
    return orderArray;
}
var keys = ["avg", "pass", "fail", "audit", "year"];
keys.push("dept", "instructor", "uuid", "title", "id");
keys.push("lat", "lon", "seats");
keys.push("fullname", "shortname", "number", "name");
keys.push("address", "type", "furniture", "href");

function buildWhereQuery(query, panel, type) {
    var conditionDiv = panel.getElementsByClassName("form-group conditions")[0];
    // typeOfCondition can be OR AND NOT
    var typeOfCondition = conditionDiv.getElementsByClassName("control-group condition-type")[0];
    // get all the radio elements from html
    var inputs = typeOfCondition.getElementsByTagName("input");
    // Check which of the radio elements is checked to determine if its AND OR NOT
    for (var i in inputs) {
        if (inputs[i].checked) {
            // Only one condition can be set
            // myCondition is either all any not
            var myCondition = inputs[i].value;
            if (myCondition === "all") {
                myCondition = "AND";
            } else if (myCondition === "any") {
                myCondition = "OR";
            } else {
                myCondition = "NOT";
            }
        }
    }
    var conditionContainer = conditionDiv.getElementsByClassName("conditions-container")[0];
    // all the conditions that go inside of the and not or
    var jsonBeforeWhere = {};
    var arrayOfInputs = [];

    // can remove if statement if only perform operation over for loop
    if (conditionContainer.childElementCount > 0) {
        var conditionContainerValues = conditionContainer.getElementsByClassName("control-group condition");
        for (var y = 0; y <  conditionContainer.childElementCount; y++) {
            // a row in the container: item
            var item = conditionContainerValues[y];
            // get if Item has the not Radio activated
            var isNot = getNotFromContainer(item);

            // get Fields: "audit" or "dept" ..
            var fields = item.getElementsByClassName("control fields")[0];
            var field = getFromContainer(fields);
            // get operators: EQ, IS ...
            var operators = item.getElementsByClassName("control operators")[0];
            var operator = getFromContainer(operators);

            // Get the term: can be any string or number
            var termDiv = item.getElementsByClassName("control term")[0];
            var term = termDiv.getElementsByTagName("input")[0].value;
            // if it is a number typecast it as such
            if (!isNaN(term) && field !== "number" && field !== "uuid" && field !== "id") {
                term = Number(term);
            }
            var jsonData = {};
            var jsonInstance = {};
            var withNot = {};
            jsonInstance[type + "_" + field] = term;
            jsonData[operator] = jsonInstance;
            if (isNot) {
                withNot["NOT"] = jsonData;
                arrayOfInputs.push(withNot);
            } else {
                arrayOfInputs.push(jsonData);
            }
        }
    }
    if (arrayOfInputs.length === 0) {
        query["WHERE"] = {};

    } else if (arrayOfInputs.length === 1) {
        query["WHERE"] = arrayOfInputs[0];
    } else {
        jsonBeforeWhere[myCondition] = arrayOfInputs;
        query["WHERE"] = jsonBeforeWhere;
    }
    return query;
}

function getNotFromContainer(item) {
    var notRadio = item.getElementsByClassName("control not")[0];
    return notRadio.getElementsByTagName("input")[0].checked;
}

function getFromContainer(item) {
    // options is an HTMLCollection, not an element like conditionContainer
    var options = item.getElementsByTagName("option");
    for(var i = 0; i < options.length; i++) {
        if (options[i].selected) {
             return options[i].value;
        }
    }
}

