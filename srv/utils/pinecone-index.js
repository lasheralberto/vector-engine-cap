import AssistantFilter from "./assistant-runner.js";

class PineconeIndex {

    static async query({
        pc,
        openaiClient,
        indexName,
        namespace,
        query,
        assistantName,
        filter = {},
        methodQueryCh, 
        topk
    }) {
        let queryDict = null;
        let queryMetadataString = null;

        // Obtener filtros de metadata según el método
        if (methodQueryCh === "openai_assistant") {
            queryDict = await this._getOpenAIFilters(openaiClient, assistantName, query);
            queryMetadataString = JSON.stringify(queryDict);
        } else if (methodQueryCh === "metadata") {
            queryDict = metadata;
        }

        // Extraer parámetros de consulta
        console.log("le vamos a poner topk", topk);
        const { sortKey, sortOrder, limit, cleanFilter } = this._extractQueryParams(queryDict, filter, topk);

        // Generar embedding
        const embedVector = await this._generateEmbedding(pc, cleanFilter.rewritten_query || query);

        // Ejecutar consulta en Pinecone
        const results = await this._executeQuery(pc.index(indexName).namespace(namespace), {
            vector: embedVector,
            filter: cleanFilter.filters,
            limit: cleanFilter.limit || limit,
            topk: cleanFilter.topk || topk
        });

        // Aplicar ordenamiento si es necesario
        console.log("Ordenación solicitada:", sortKey, sortOrder);
        if (sortKey && sortOrder && results.matches.length > 0) {
            this._sortResults(results.matches, sortKey, sortOrder);
        }

        return { results, queryMetadataString };
    }

    // Métodos auxiliares privados
    static async _getOpenAIFilters(openaiClient, assistantName, query) {
        try {
            const assistRunner = new AssistantFilter(openaiClient, openaiClient.apiKey);
            const filtroMetadata = await assistRunner.runQueryToAssistant(assistantName, query);
            //console.log("Filtro metadata obtenido:", filtroMetadata);
            return filtroMetadata;
        } catch (e) {
            throw new Error("Error al ejecutar OpenAI Assistant: " + e.message);
        }
    }

    static _extractQueryParams(queryDict, defaultFilter, topk) {

        if (!queryDict || queryDict === "null") {
            return {
                sortKey: null,
                sortOrder: null,
                limit: 5,
                cleanFilter: defaultFilter
            };
        }

        const { sort, order, limit: lim, ...cleanFilter } = queryDict;
        console.log("Filtros sin procesar:", queryDict);
        console.log("Parámetros de consulta extraídos:", { sort, order, lim, cleanFilter });

        return {
            sortKey: sort || null,
            sortOrder: order ?? 1,
            limit: lim || topk,
            cleanFilter: Object.keys(cleanFilter).length > 0 ? cleanFilter : defaultFilter
        };
    }

    static async _generateEmbedding(pc, query) {
        const userQuery = [query];
        const queryParameters = { inputType: "query" };

        const embedResponse = await pc.inference.embed(
            "llama-text-embed-v2",
            userQuery,
            queryParameters
        );

        return embedResponse.data[0].values;
    }

    static async _executeQuery(index, { vector, filter, limit, topk }) {
        const baseQuery = {
            vector,
            topK: limit || topk || 5,
            includeValues: false,
            includeMetadata: true
        };

        // Agregar filtro solo si tiene contenido
        if (filter !=null && Object.keys(filter).length > 0) {
            baseQuery.filter = filter;
        }

        let results = await index.query(baseQuery);

        // Si no hay resultados con filtro, intentar sin filtro
        if (results.matches.length === 0 && baseQuery.filter) {
            delete baseQuery.filter;
            results = await index.query(baseQuery);
        }

        return results;
    }

    static _sortResults(matches, sortKey, sortOrder) {
        matches.sort((a, b) => {
            const valA = a.metadata?.[sortKey];
            const valB = b.metadata?.[sortKey];
            
            
            if (valA < valB) return sortOrder;

            if (valA > valB) return -sortOrder;
            return 0;
        });
         
    }

}

export default PineconeIndex;