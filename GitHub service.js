// ************************* GitHub service
// https://developers.google.com/apps-script/reference/properties/properties-service#getuserproperties
var userProperties = PropertiesService.getUserProperties();
var CLIENT_ID = userProperties.getProperty('CLIENT_ID');
var CLIENT_SECRET = userProperties.getProperty('CLIENT_SECRET');
if (!userProperties.getProperty('CLIENT_ID')){
  Logger.log('Warning: CLIENT_ID needed.')
}
// configure the service
function getGithubService_() {
  return OAuth2.createService('GitHub')
    .setAuthorizationBaseUrl('https://github.com/login/oauth/authorize')
    .setTokenUrl('https://github.com/login/oauth/access_token')
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('user'); 
}

// Logs the callback URL to register APP on GitHub
function logRedirectUri() {
  var service = getGithubService_();
  Logger.log(service.getRedirectUri());
}

// handle the callback after User authorized App but URL
function authCallback(request) {
  var githubService = getGithubService_();
  var isAuthorized = githubService.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  }
}

function deleteUserProperties(){
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteAllProperties();
 }
 
 function getAuthorizationURL(){
  var service = getGithubService_();
  var authorizationUrl = service.getAuthorizationUrl();
   showLinkInSidebar('Denied:','Open the following URL and re-run the script', authorizationUrl); 
}

