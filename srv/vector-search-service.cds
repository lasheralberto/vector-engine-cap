@OData.publish: true
service VectorSearchService @(requires: 'any'){

  type SearchParams {
    query: String;
    topk: Integer;
  }

  type SearchResults {
      key Id: UUID;
      idConfig: String(100);
      query: String(1000);
      filters:String(1000);
      results: LargeString;
      timestamp: Timestamp;
  }
  
  @HTTP.POST
  action performVectorSearch(params: SearchParams) returns SearchResults;

}