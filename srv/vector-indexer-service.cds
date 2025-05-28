@Odata.publish:true

service VectorIndexerService  @(requires: 'any'){

    type IndexingResults {
        key Id: UUID;
        idConfig: String(100);
        indexName: String(100);
        namespace: String(100);
        totalRecords: Integer;
        totalIndexed: Integer;
        status: String(50);
        message: String(1000);
        timestamp: Timestamp;
    }

    type BatchStatus {
        batchNumber: Integer;
        totalBatches: Integer;
        recordsProcessed: Integer;
        status: String(50);
        message: String(500);
    }

    @HTTP.POST
    action populateVectorIndex(
        data: LargeString,           // JSON array con los datos a indexar
        idFieldName: String(100)     // Nombre del campo que será usado como ID
    ) returns IndexingResults;

    // Acción para indexación por lotes (para cargas muy grandes)
    @HTTP.POST
    action populateVectorIndexBatch(
        data: LargeString,           // JSON array con el lote de datos
        idFieldName: String(100),    // Nombre del campo ID
        batchNumber: Integer,        // Número del lote actual
        totalBatches: Integer        // Total de lotes
    ) returns BatchStatus;

    // Acción para verificar el estado de un índice
    @HTTP.GET
    action getIndexStatus() returns {
        indexName: String(100);
        namespace: String(100);
        totalVectors: Integer;
        dimension: Integer;
        metric: String(50);
        status: String(50);
    };

    // Acción para crear un nuevo índice vacío
    @HTTP.POST
    action createIndex() returns {
        indexName: String(100);
        status: String(50);
        message: String(500);
    };

}