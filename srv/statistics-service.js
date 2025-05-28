
import { AdvancedDifferenceComparator } from "./utils/calculator-statistics.js";
import AssistantFilter from "./utils/assistant-runner.js";
import VectorEngineUtils from "./utils/vector-utils.js";
import { OpenAI } from 'openai';
import { results } from "@sap/cds/lib/utils/cds-utils.js";

export default cds.service.impl(async function () {
    this.on('performStatisticsService', async (req) => {

        let dataDeserialized = null;
        const { query } = req.data;



        try {

            dataDeserialized = JSON.parse(query);
            console.log("Datos deserializados:", dataDeserialized);
        } catch (err) {
            req.error(400, 'Invalid JSON ');
            return;
        }

        const dataMatches = {
            results: dataDeserialized.results,  
        };


        // Inicializar con campo de clase
        const comparator = new AdvancedDifferenceComparator(dataMatches);

        // Para imprimir reporte limpio
        const output = comparator.printDifferenceReport();

        
        //runQueryToAssistant con el assistant y el resultsStats
        // Obtener configuración del header
        const configId = req._.req.headers['x-config-id'];
        if (!configId) {
            req.error(400, 'Header x-config-id es requerido');
            return;
        }

        //const config = await VectorEngineUtils.getConfiguration(configId);
        //const openaiClient = new OpenAI({ apiKey: config.openai_project_key });
        //const runner = new AssistantFilter(openaiClient, config.openai_project_key);

        // const filterResult = await runner.runQueryToAssistant(
        //     config.assistant_id_stats,
        //     output,
        // );

        const resultStats = {
            result: JSON.stringify(output),
                //result: JSON.stringify(filterResult)

        }

        return resultStats;

    });
});