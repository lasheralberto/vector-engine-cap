import cds from '@sap/cds';
import { OpenAI } from 'openai';
import VectorEngineUtils from "./utils/vector-utils.js";
import AssistantFilter from "./utils/assistant-runner.js";


export default cds.service.impl(async function () {
    this.on('performFilterSearchAssistant', async (req) => {
        try {
            // Obtener configuración del header
            const configId = req._.req.headers['x-config-id'];
            if (!configId) {
                req.error(400, 'Header x-config-id es requerido');
                return;
            }

            // Obtener query del body
            const { query } = req.data;
            if (!query) {
                req.error(400, 'Query es requerido en el body');
                return;
            }

            // Cargar configuración
            const config = await VectorEngineUtils.getConfiguration(configId);
            if (!config) {
                req.error(404, `Configuración '${configId}' no encontrada`);
                return;
            }

            const openaiClient = new OpenAI({ apiKey: config.openai_project_key });
            const runner = new AssistantFilter(openaiClient, config.openai_project_key);

            const filterResult = await runner.runQueryToAssistant(
                config.assistant_id,
                query,
            );
            console.log("Respuesta Filtros:", filterResult);
            
            return filterResult;
        } catch (error) {
            console.error("Error en la consulta:", error);
            req.error(500, 'Error en la consulta');
            return;
        }
    });
});

export { AssistantFilter as AssistantRunner };