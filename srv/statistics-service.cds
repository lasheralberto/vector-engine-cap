@Odata.publish: true 
service StatisticsService @(requires:'any'){
  type Result {
    result:LargeString;
  }
  @HTTP.POST
  action performStatisticsService(query: LargeString) returns Result;
}