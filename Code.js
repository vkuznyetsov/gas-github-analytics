// **************************** Add custom menu
//var repo, filter, state, labels, sort, direction, targetDate, period, interval;
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  //var ui = SpreadsheetApp.getUi();
  ui.createMenu('Report')
  .addItem('Get report','showReport')
  .addSeparator()
  .addItem('Set CLIENT_ID/SECRET', 'uiStoreCredentials')
  .addItem('Get authorization URL', 'getAuthorizationURL')
  .addSeparator()
  .addItem('Remove Credentials', 'deleteUserProperties')  
  .addToUi();
}

// *************************** Get Data from spreadsheet *****************************************
function getSourceData(){
  var ss = SpreadsheetApp.openById('1Wdsni4ctdZyTjGbQuRL2dMQIYkd-DTJHU0_Qp5qxB9U');
  var sheet = ss.getSheetByName('Data');
  var data = sheet.getRange(2, 2, 10).getValues(); // 9 rows contain data
  //Logger.log(Session.getScriptTimeZone());
  // Logger.log(data[6][0]);
  // Logger.log(Date.parse(data[6][0]));
  // Logger.log(new Date(Date.parse(data[6][0])));
  // Logger.log(Utilities.formatDate(new Date(Date.parse(data[6][0])), "GMT+02:00", "yyyy-MM-dd'T'HH:mm:ss'Z'"));
  return {'repo':data[0][0],'filter':data[1][0],'state':data[2][0],
          'labels':data[3][0],'sort':data[4][0],'direction':data[5][0],
          'target_date':Utilities.formatDate(new Date(Date.parse(data[6][0])), "GMT+02:00", "yyyy-MM-dd'T'HH:mm:ss'Z'"),
          'period':data[7][0],'interval':data[8][0],
          'excludeLabels':data[9][0]};
}

// *************************** Get issues from GitHub, Go through the issues, and Calculate metrics 
function getIssueStatistics(){
  var data = getSourceData();
  var targetDateMs = Date.parse(data.target_date); // 2018-01-23T12:28:23Z Ch6 release https://api.github.com/repos/eclipse/che/issues/8419
  var createdFilter = 'created_at',
  closedFilter = 'closed_at';
  var interval = data.interval * 86400000; //days * ms/per day
  var startDate = targetDateMs - data.period * 86400000; //1 day lasts 86400000 ms
//  var endDate = targetDateMs + data.period * 86400000;
  var endDate = targetDateMs;
  var repo = data.repo;
  var filter = data.filter;
  var state = data.state;
  var labels = data.labels;
  var sort = data.sort;
  var direction = data.direction;
  var excludeLabels = data.excludeLabels;
  //since calculated by subtraction priod from target date
  var since = Utilities.formatDate(new Date(startDate), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
  var ih = populateIssueHolder(repo,filter,state,labels,sort,direction,since,excludeLabels);
  var result = [];
  var cumulative_created = 0,
  cumulative_closed = 0;
  // Logger.log('Start searching for period.........' + (endDate - startDate)/interval + ' iterations');
  // 
  
  for (var x = startDate; x <= endDate; x += interval){
    var created = Object.keys(getIssuesForPeriod(ih, x, interval, createdFilter)).length;
    var closed = Object.keys(getIssuesForPeriod(ih, x, interval, closedFilter)).length;
    cumulative_created += created;
    cumulative_closed += closed;
    result.push({'date':Utilities.formatDate(new Date(x), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'"),'created':created,'closed':closed,'cumulative_created':cumulative_created,'cumulative_closed':cumulative_closed});

  }
  return result;
}

function getIssuesForPeriod(issueHolder, startMs, interval, field){
  var response = [];
  var issues = issueHolder.getIssues();
  var startDate = Utilities.formatDate(new Date(startMs), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
  var endDate = Utilities.formatDate(new Date(startMs + interval), "GMT", "yyyy-MM-dd'T'HH:mm:ss'Z'");
  // Logger.log('Getting ' + field + ' for period ..........' + startDate + '...' + endDate);
  for (var x=0;x<Object.keys(issues).length;x++){
    if (issues[x][field]){
      // Logger.log(x + ') Considering issue '+ field +' : ' + issues[x][field] + ' Url: ' + issues[x]['html_url']);
      if (issues[x][field] >= startDate && issues[x][field] < endDate){
      // Logger.log('Satisfied: ' + issues[x][field]);
      response.push(issues[x]);
      // Logger.log(issues[x]['html_url']);
    }
  }
  }
  return response;
}

function getIssues(repo, filter, excludeLabels){
  //It is possible to filter PR wich have pull_request key!!!!!
  // ---------------------------------------------------
  var issues = [];
  var service = getGithubService_();
  if (service.hasAccess){
    var url = "https://api.github.com/repos/" + repo + '/issues' + filter;
    var headers = {
      "Authorization": "Bearer " + getGithubService_().getAccessToken(),
      "Accept": "application/vnd.github.v3+json"
    };
    var options = {
      "headers": headers,
      "method" : "GET",
      "muteHttpExceptions": true
    };
    var pagination = {'next':url}; //prepare the initial request
    var response,
    rspHeaders;
    // Logger.log('---------- START Pagination -------------------')
    do {
    // Logger.log(pagination.next);
    response = UrlFetchApp.fetch(pagination.next,options);
    pagination = {}; //Clean up pagination object
    issues = mergeTheseObjects(issues, excludeIssuesByLabel(getIssuesOnly(JSON.parse(response.getContentText())), excludeLabels));
      // Logger.log('I\'ve got ' + Object.keys(issues).length);
    rspHeaders = response.getHeaders();
    //Loop through GitHub pagination
    if (rspHeaders.Link){
      //Convert Link header into the object like {'url':'next'}
      const regex = /<(.+?)>; rel="(.+?)"/gmi;
      var m;
      while ((m = regex.exec(rspHeaders.Link)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        pagination[m[2]] = m[1];
      }
    }else{
      // Logger.log('ERROR: No headers in response. Link ' + rspHeaders.Link);
    }
  } while (pagination.next);

    // Logger.log('getIssues() found: ' + Object.keys(issues).length + ' records.' );
    return issues;
    
  }else{
    // Logger.log('Error: getIssues() - App script has no access');
    // goto url to get authorized by github
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log("Open the following URL and re-run the script: %s", authorizationUrl);
    return null;
  }
}

// This used for combining results from pagination in getIssues()
function mergeTheseObjects(acceptor, donor){
  
  var iAcc = Object.keys(acceptor).length;
  var iDon = Object.keys(donor).length;
  for (x=0;x<iDon;x++){
    acceptor[iAcc+x] = donor[x];
  }
  return acceptor;
}

function sortIssues(issues, field){
  //Logger.log('Sorting................ ');
  var left = 0;
  var length = Object.keys(issues).length;
  var right = length - 1;
  var temp;
  while(right > left){
    // go to the right
    for (x=left;x<right;x++){
      if (issues[x][field] > issues[x + 1][field]){
        temp = issues[x];
        issues[x] = issues[x + 1];
        issues[x + 1] = temp;
      }
    }
    right--;
      // go to the left
    for (x=right;x>left;x--){
      if (issues[x][field] < issues[x - 1][field]){
        temp = issues[x];
        issues[x] = issues[x - 1];
        issues[x - 1] = temp;
      }
    }
    left++;
  }
  // Logger.log('Object has been sorted by ...' + field);
  return issues;
}

function populateIssueHolder(repo,filter,state,labels,sort,direction,since,excludeLabels) {
  var ih = new IssueHolder('eclipse/che');
  var issues = ih.getGHissues(filter,state,labels,sort,direction,since,excludeLabels);
  // Logger.log('IssuesHolder is populated.');
  return ih;
}

function excludeIssuesByLabel(issues, excludeLabel){
  var cleaned = [], flag;
  var inpLength = Object.keys(issues).length;
  //Logger.log('Total issues before cleanup: ' + inpLength);
  for (var x=0;x<inpLength;x++){
    flag = true;
    issues[x].labels.forEach(function(label){
      //Logger.log('Label: ' + label.name);
      if (label.name === excludeLabel){
        //Logger.log('====== Exclude Label found: ' + label.name);
        flag = false;
      return;
    }
    });
    if (flag){
      cleaned.push(issues[x]);
      //Logger.log('Push data');
    }
  }
  //Logger.log('Cleaned list contains: ' + Object.keys(cleaned).length);
  // Logger.log('Excluded with label: ' + excludeLabel + ' : ' + (inpLength - Object.keys(cleaned).length));
  return cleaned;
}

// Removes PRs from response
function getIssuesOnly(input){
  var issuesOnly = [];
  var inpLength = Object.keys(input).length;
  //remove pull_requests
    for (var x=0;x<Object.keys(input).length;x++){
      if (!input[x]['pull_request']){
      issuesOnly.push(input[x]);
      }
    }
  // Logger.log('Removed: ' + (inpLength - Object.keys(issuesOnly).length) + ' PRs');
  return issuesOnly;
}

function sortIssues(issues, field){
  //Logger.log('Sorting................ ');
  var left = 0;
  var length = Object.keys(issues).length;
  var right = length - 1;
  var temp;
  while(right > left){
    // go to the right
    for (x=left;x<right;x++){
      if (issues[x][field] > issues[x + 1][field]){
        temp = issues[x];
        issues[x] = issues[x + 1];
        issues[x + 1] = temp;
      }
    }
    right--;
      // go to the left
    for (x=right;x>left;x--){
      if (issues[x][field] < issues[x - 1][field]){
        temp = issues[x];
        issues[x] = issues[x - 1];
        issues[x - 1] = temp;
      }
    }
    left++;
  }
  // Logger.log('Object has been sorted by ...' + field);
  return issues;
}

var IssueHolder = function(repo) {
  this.repo = repo; // format 'org/project'
  this.issues = [];
  
  this.getGHissues = function(filter,state,labels,sort,direction,since,excludeLabels){
    //https://developer.github.com/v3/issues/#parameters
    
  //filter,
    //* assigned: Issues assigned to you
    //* created: Issues created by you
    //* mentioned: Issues mentioning you
    //* subscribed: Issues you're subscribed to updates for
    //* all: All issues the authenticated user can see, regardless of participation or creation
    //Default: assigned
  //state,
    //open, closed, or all. Default: open
  //labels,
    //A list of comma separated label names. Example: bug,ui,@high
  //sort,
    //created, updated, comments. Default: created
  //direction,
    //asc or desc. Default: desc
  //since
    //Only issues updated at or after this time are returned. This is a timestamp in ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ. (date.toISOString())
    // first eclipse che issue date 2015-04-16T07:45:16Z
    
    //Example
//  var repo = 'eclipse/che';
//  var filter = 'all';
//  var state = 'open';
//  var labels = 'kind/bug';
//  var sort = 'created';
//  var direction = 'asc';
//  var since = '';
if (!filter){
  filter = '&filter=all';
}else{filter = '&filter=' + filter}
if (!state){
  state = '&state=open';
}else{state = '&state=' + state}
if (!labels){
  labels = '';
}else{labels = '&labels=' + labels}
if (!sort){
  sort = '&sort=created';
}else {sort = '&sort=' + sort}
if (!direction){
  direction = '&direction=asc';
}else {direction = '&direction=' + direction}
if (!since){
  since = '';
}else {direction = '&since=' + since}
    
if (!repo){
  repo = 'eclipse/che';
}
  var params = '?per_page=100' + filter + state + labels + sort + direction + since;
  this.issues = getIssues(this.repo,params, excludeLabels);
  return this.issues;
  }
  this.getIssues = function(){
  return this.issues;
  }
}

// *******************************           Report results
function showReport() {
  var data = getSourceData();
  var ss = SpreadsheetApp.openById('1Wdsni4ctdZyTjGbQuRL2dMQIYkd-DTJHU0_Qp5qxB9U');
  var reportSheet;
  if (!(reportSheet = ss.getSheetByName(data.target_date))){
  reportSheet = ss.insertSheet(data.target_date);
}
  // Logger.log('Report sheet is: +++++++++++++++++ ' + reportSheet.getName());
  reportSheet.clear().activate();
  var header = reportSheet.getRange(1, 1, 2, 5);
  header.setValues([['Report created for target Date: ' + data.target_date,'','','',''],['Date','Created','Closed','Cumulative created','Cumulative closed']]).setBackground('gray').setFontSize(12);
  reportSheet.autoResizeColumns(1, 5);
  var result = getIssueStatistics();
  //show results
  // Logger.log('reportToSpreadSheet: results: ' + Object.keys(result).length);
  if (Object.keys(result).length>0){
    var rng = reportSheet.getRange(3, 1, Object.keys(result).length, 5);
    var data = [];
    for (x=0;x<Object.keys(result).length;x++){
      data.push([result[x]['date'],result[x]['created'],result[x]['closed'],result[x]['cumulative_created'],result[x]['cumulative_closed']]);
      // Logger.log(result[x]['date']);
      // Logger.log('For period starts from date: ' + result[x]['created'] + '/' + result[x]['closed']);
      // Logger.log('Cumulative: ' + result[x]['cumulative_created'] + '/' + result[x]['cumulative_closed']);
    }
    rng.setValues(data);
  }
}