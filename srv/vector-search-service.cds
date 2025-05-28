@OData.publish: true
service VectorSearchService @(requires: 'any'){

 
  type SearchResults {
      key Id: UUID;
      idConfig: String(100);
      query: String(1000);
      filters:String(1000);
      results: LargeString;
      timestamp: Timestamp;
  }
  
  @HTTP.POST
  action performVectorSearch(query: String ) returns SearchResults;

}