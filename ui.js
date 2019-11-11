// *********************  UI 
function showSideBarMessage(title, message){
  var ui = SpreadsheetApp.getUi();
  var htmlMessage = HtmlService
  .createHtmlOutput('<h3>' + message + '</h3>')
  .setTitle(title);
  ui.showSidebar(htmlMessage);
}

function showLinkInSidebar(title, message, link){
var ui = SpreadsheetApp.getUi();
  var htmlMessage = HtmlService
  .createHtmlOutput('<a target="_blank" href="' + link + '">' + message + '</a>')
  .setTitle(title);
  ui.showSidebar(htmlMessage);
}

function uiStoreCredentials() {
  var userProperties = PropertiesService.getUserProperties();
  var ui = SpreadsheetApp.getUi();
  var output, response;
  response = ui.prompt('Please provide CLIENT_ID', ui.ButtonSet.OK_CANCEL);
  userProperties.setProperty('CLIENT_ID', response.getResponseText());
  response = ui.prompt('Please provide CLIENT_SECRET', ui.ButtonSet.OK_CANCEL);
  userProperties.setProperty('CLIENT_SECRET', response.getResponseText());
  Logger.log(userProperties.getProperty('CLIENT_ID') + '====' + userProperties.getProperty('CLIENT_SECRET'));
}
