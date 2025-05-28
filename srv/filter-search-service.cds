@Odata.publish: true 
service FilterSearchService @(requires:'any'){
  type FilterResult {
    key Id: UUID;
    assistantName: String(100);
    query:String(1000);
    result:LargeString;
    timestamp:Timestamp;
  }
  @HTTP.POST
  action performFilterSearchAssistant(query: String) returns FilterResult;
}