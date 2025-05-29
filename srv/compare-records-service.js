import {ComparatorAlgorithm} from './utils/comparator-algorithm.js';
export default cds.service.impl(async function () {
    this.on('performComparisonService', async (req) => {
        let dataDeserialized = null;
        const { recordsPayload } = req.data;
        console.log("Payload recibido:", recordsPayload);

        // Validar y deserializar datos
        try {
            dataDeserialized = JSON.parse(recordsPayload);
            console.log("Datos deserializados:", dataDeserialized);
        } catch (err) {
            req.error(400, 'JSON inválido en el query');
            return;
        }

        // Validar estructura de datos
        if (!dataDeserialized.records || !Array.isArray(dataDeserialized.records)) {
            req.error(400, 'Se requiere un array de records');
            return;
        }

        if (dataDeserialized.records.length === 0) {
            req.error(400, 'Debe proporcionar al menos un registro para comparar');
            return;
        }

        // Validar que el parámetro de columnas esté presente
        if (!dataDeserialized.columnsToCompare || !Array.isArray(dataDeserialized.columnsToCompare)) {
            req.error(400, 'Se requiere un array de columnsToCompare especificando qué columnas comparar');
            return;
        }

        try {
            // Procesar comparación
            //Instanciar el algoritmo de comparación
            const comparator = new ComparatorAlgorithm();
            const comparisonResult = comparator.performComparison(
                dataDeserialized.records, 
                dataDeserialized.columnsToCompare,
                dataDeserialized.options || {}
            );
            
            const resultComparison = {
                result: JSON.stringify(comparisonResult)
            };

            return resultComparison;

        } catch (error) {
            console.error('Error en performComparison:', error);
            req.error(500, 'Error interno al procesar la comparación');
            return;
        }
    });
});