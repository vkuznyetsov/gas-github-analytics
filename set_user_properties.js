function cls(){
 var userProperties = PropertiesService.getUserProperties();
 userProperties.deleteAllProperties();
}

function storeCredentials(){
  userProperties.setProperty('CLIENT_ID', ''); //put here your CLIENT_ID
  userProperties.setProperty('CLIENT_SECRET', '');
  Logger.log('Successfully set CLIENT_ID, CLIENT_SECRET'); //put here your CLIENT_SECRET
  
}

function showUserCredentials(){
  Logger.log(userProperties.getProperties());
}

// *********************  UI 
function showSideBarMessage(title, message){
  var ui = SpreadsheetApp.getUi();
  var htmlMessage = HtmlService
  .createHtmlOutput('<h3>' + message + '</h3>')
  .setTitle(title);
  ui.showSidebar(htmlMessage);
}

function sideBar(){
var htmlOutput = HtmlService
    .createHtmlOutput('<p>A change of speed, a change of style...</p>')
    .setTitle('My add-on');
SpreadsheetApp.getUi().showSidebar(htmlOutput);
}