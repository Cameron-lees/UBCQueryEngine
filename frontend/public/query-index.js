/**
 * This hooks together all the CampusExplorer methods and binds them to clicks on the submit button in the UI.
 *
 * The sequence is as follows:
 * 1.) Click on submit button in the reference UI
 * 2.) Query object is extracted from UI using global document object (CampusExplorer.buildQuery)
 * 3.) Query object is sent to the POST /query endpoint using global XMLHttpRequest object (CampusExplorer.sendQuery)
 * 4.) Result is rendered in the reference UI by calling CampusExplorer.renderResult with the response from the endpoint as argument
 */

// Add an event listener to the button
// Once the button is clicked you call query-builder where you construct the query using the DOM
// After you have your query yo call query-sender with the query as parameter
// The query-sender function then calls the post method on your REST end point and returns result
// Use previous result with renderResult
var myButton = document.getElementById("submit-button");
myButton.addEventListener("click", function (event) {
   var query = CampusExplorer.buildQuery();
   CampusExplorer.sendQuery(query).then(function (value) {
       CampusExplorer.renderResult(value);
   });
});

