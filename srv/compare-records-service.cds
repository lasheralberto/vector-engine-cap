@Odata.publish: true 
service CompareRecordsService @(requires:'any'){
  type resultComp {
    resultComparison:LargeString;
  }
  @HTTP.POST
  action performComparisonService(recordsPayload: LargeString) returns resultComp;
}