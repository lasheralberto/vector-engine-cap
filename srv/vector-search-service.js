import cds from '@sap/cds';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import VectorEngineUtils from "./utils/vector-utils.js";
import PineconeIndex from "./utils/pinecone-index.js";

export default cds.service.impl(async function () {
    this.on('performVectorSearch', async (req) => {
        try {
            // Obtener configuración del header
            const configId = req._.req.headers['x-config-id'];
            if (!configId) {
                req.error(400, 'Header x-config-id es requerido');
                return;
            }

            // Obtener query y metadata del body
            //Enviaremos desde el backend un JSON con la query y el topk
            console.log("Request data:", req.data);
 
            const { query , topk } = req.data.params;
            console.log("Query:", query);
            console.log("TopK:", topk);

            // Cargar configuración
            const config = await VectorEngineUtils.getConfiguration(configId);
            if (!config) {
                req.error(404, `Configuración '${configId}' no encontrada`);
                return;
            }

            const pineconeKey = config.pinecone_key;
            const openaiKey = config.openai_project_key;
            const indexName = config.index;
            const namespace = config.namespace;
            const assistantName = config.assistant_id;
            const methodQueryCh = config.method_query_ch || "openai_assistant"; // Valor por defecto si no se especifica


            const pc = new Pinecone({ apiKey: pineconeKey });
            const openaiClient = new OpenAI({ apiKey: openaiKey });

            // Ejecutar búsqueda vectorial con el nuevo parámetro metadata
            const { results, queryMetadataString } = await PineconeIndex.query({
                pc,
                openaiClient,
                indexName,
                namespace,
                query,
                assistantName,
                methodQueryCh, 
                topk
            });

            console.log("Resultados de la búsqueda:", results);
            console.log("Metadata de la consulta:", queryMetadataString);

            // Formatear resultados
            const formattedResults = results.matches.map(match => ({
                id: match.id,
                score: match.score,
                metadata: match.metadata
            }));

            const response = {
                idConfig: configId,
                query: query,
                filters: queryMetadataString,
                results: formattedResults
            };

            return response;

        } catch (error) {

            req.error(500, `Error interno del servidor: ${error.message}`);
        }
    });


});