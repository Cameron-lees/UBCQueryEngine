/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function(query) {
    return new Promise(function(fulfill, reject) {
        var request = new XMLHttpRequest();
        request.open('POST', '/query', true);
        request.setRequestHeader("Content-Type", "application/json");
        request.onload = function() {
            console.log(request.responseText);
            fulfill(request.responseText);
        };
        request.onerror = function () {
            reject(request.error);
        };
        request.send(JSON.stringify(query));
    });
};
