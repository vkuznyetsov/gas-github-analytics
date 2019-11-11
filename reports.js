// *******************************           Report results
function showReport() {
  var data = getSourceData();
  var ss = SpreadsheetApp.openById('1Wdsni4ctdZyTjGbQuRL2dMQIYkd-DTJHU0_Qp5qxB9U');
  var reportSheet;
  if (!(reportSheet = ss.getSheetByName(data.target_date))){
  reportSheet = ss.insertSheet(data.target_date);
}
  Logger.log('Report sheet is: +++++++++++++++++ ' + reportSheet.getName());
  reportSheet.clear().activate();
  var header = reportSheet.getRange(1, 1, 2, 5);
  header.setValues([['Report created for target Date: ' + data.target_date,'','','',''],['Date','Created','Closed','Cumulative created','Cumulative closed']]).setBackground('gray').setFontSize(12);
  reportSheet.autoResizeColumns(1, 5);
  var result = getIssueStatistics();
  //show results
  Logger.log('reportToSpreadSheet: results: ' + Object.keys(result).length);
  if (Object.keys(result).length>0){
    var rng = reportSheet.getRange(3, 1, Object.keys(result).length, 5);
    var data = [];
    for (x=0;x<Object.keys(result).length;x++){
      data.push([result[x]['date'],result[x]['created'],result[x]['closed'],result[x]['cumulative_created'],result[x]['cumulative_closed']]);
      Logger.log(result[x]['date']);
      Logger.log('For period starts from date: ' + result[x]['created'] + '/' + result[x]['closed']);
      Logger.log('Cumulative: ' + result[x]['cumulative_created'] + '/' + result[x]['cumulative_closed']);
    }
    rng.setValues(data);
  }
}