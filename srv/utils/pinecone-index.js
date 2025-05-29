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

        const { sortKey, sortOrder, limit, cleanFilter } = this._extractQueryParams(queryDict, filter, topk);

        // Generar embedding
        const embedVector = await this._generateEmbedding(pc, cleanFilter.rewrittenQuery || query);

        const sumLimits = cleanFilter.limits?.reduce((acc, val) => acc + val, 0);


        const queryOptions = {
            vector: embedVector,
            filter: cleanFilter.filters,
            limit: sumLimits ?? topk,
            topk: sumLimits ?? topk
        };

        console.log("Parámetros de consulta generados definitivos:", queryOptions);

        // Ejecutar consulta en Pinecone sin sorts (No los admite Pinecone directamente)
        const results = await this._executeQuery(
            pc.index(indexName).namespace(namespace),
            queryOptions
        );

        // Aplicar ordenamiento si es necesario
        console.log("Claves de ordenamiento:", sortKey);
        console.log("Orden de ordenamiento:", sortOrder);
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

        let sortKeys = null;
        let sortOrders = null;

        //Manejar caso de sorts como array o como objeto
        if (Array.isArray(cleanFilter.sorts)) {
            if (cleanFilter.sorts.length > 0) {
                sortKeys = cleanFilter.sorts.map(s => s.field);
                sortOrders = cleanFilter.sorts.map(s => parseInt(s.order) || 1);
            }
        } else if (cleanFilter.sorts && typeof cleanFilter.sorts === 'object') {
            // Caso de un solo objeto
            sortKeys = [cleanFilter.sorts.field];
            sortOrders = [parseInt(cleanFilter.sorts.order) || 1];
        }

        const sumLimits = cleanFilter.limits?.reduce((acc, val) => acc + val, 0);

        return {
            sortKey: sortKeys || sort || null,
            sortOrder: sortOrders || order || 1,
            limit: sumLimits ?? topk,
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
        if (filter != null && Object.keys(filter).length > 0) {
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

    static _sortResults(matches, sortKeys, sortOrders) {
        matches.sort((a, b) => {
            for (let i = 0; i < sortKeys.length; i++) {
                const key = sortKeys[i];
                const order = sortOrders[i] || 1;

                const valA = a.metadata?.[key];
                const valB = b.metadata?.[key];

                if (valA < valB) return order;
                if (valA > valB) return -order;
                // si son iguales, sigue al siguiente criterio
            }
            return 0; // todos iguales
        });
    }


}

export default PineconeIndex;