import { Pinecone } from '@pinecone-database/pinecone';

// // /** PENDIENTE 
class PineconeIndexer {
    /**
     * Convierte a minúsculas y elimina acentos/caracteres especiales.
     * @param {string} value - Cadena a normalizar
     * @returns {string} - Cadena normalizada
     */
    static normalizeString(value) {
        if (typeof value !== 'string') {
            return value;
        }
        
        // Convertir a minúsculas
        value = value.toLowerCase();
        
        // Normalizar y eliminar acentos
        value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        return value;
    }

    /**
     * Generar texto de cada fila (con todas las columnas).
     * @param {Object} row - Objeto con los datos de la fila
     * @returns {string} - Texto generado concatenando todas las columnas
     */
    static generateRowText(row) {
        const campos = [];
        
        for (const [col, value] of Object.entries(row)) {
            // Verificar que el valor no sea null, undefined o vacío
            if (value !== null && value !== undefined && value !== '') {
                campos.push(`${col}: ${value}`);
            }
        }
        
        return campos.join(' | ');
    }

    /**
     * Función para indexar los datos en Pinecone.
     * @param {Object} params - Parámetros de configuración
     * @param {Pinecone} params.pc - Cliente de Pinecone
     * @param {string} params.indexName - Nombre del índice
     * @param {string} params.namespace - Namespace del índice
     * @param {Array} params.dataframe - Array de objetos con los datos
     * @param {string} params.idOfDocument - Campo que será usado como ID
     */
    static async populateDataInIndex({
        pc,
        indexName,
        namespace,
        dataframe,
        idOfDocument
    }) {
        try {
            // Verificar si el índice existe, si no, crearlo
            const existingIndexes = await pc.listIndexes();
            const indexExists = existingIndexes.indexes?.some(index => index.name === indexName);
            
            if (!indexExists) {
                console.log(`Creando índice: ${indexName}`);
                await pc.createIndex({
                    name: indexName,
                    dimension: 1024,
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1'
                        }
                    }
                });
                
                // Esperar a que el índice esté listo
                console.log('Esperando a que el índice esté listo...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }

            const index = pc.index(indexName).namespace(namespace);
            
            // Filtrar datos que tengan el campo ID
            const filteredData = dataframe.filter(row => 
                row[idOfDocument] !== null && 
                row[idOfDocument] !== undefined && 
                row[idOfDocument] !== ''
            );

            console.log(`Procesando ${filteredData.length} registros...`);

            const vectorInputs = [];

            // Preparar datos para indexación
            for (const row of filteredData) {
                const content = PineconeIndexer.generateRowText(row);
                const metadata = {};

                // Construir metadata normalizando strings
                for (const [col, val] of Object.entries(row)) {
                    if (val !== null && val !== undefined && val !== '') {
                        if (typeof val === 'string') {
                            metadata[col] = PineconeIndexer.normalizeString(val);
                        } else {
                            metadata[col] = val;
                        }
                    }
                }

                vectorInputs.push({
                    id: String(row[idOfDocument]),
                    content: content,
                    metadata: metadata
                });
            }

            // Procesar en lotes de 20
            const batchSize = 20;
            const total = vectorInputs.length;
            
            for (let i = 0; i < total; i += batchSize) {
                const batch = vectorInputs.slice(i, i + batchSize);
                const contents = batch.map(v => v.content);

                try {
                    // Generar embeddings usando la API de Pinecone
                    const embedResponse = await pc.inference.embed(
                        'llama-text-embed-v2',
                        contents,
                        {
                            inputType: 'passage'
                        }
                    );

                    // Preparar vectores para upsert
                    const vectors = batch.map((v, idx) => ({
                        id: v.id,
                        values: embedResponse.data[idx].values,
                        metadata: v.metadata
                    }));

                    // Insertar vectores
                    await index.upsert(vectors);
                    
                    const batchNumber = Math.floor(i / batchSize) + 1;
                    const totalBatches = Math.ceil(total / batchSize);
                    console.log(`Subido lote ${batchNumber} de ${totalBatches}`);
                    
                } catch (error) {
                    console.error(`Error procesando lote ${Math.floor(i / batchSize) + 1}:`, error);
                    throw error;
                }
            }

            console.log(`${total} materiales indexados correctamente.`);
            return { success: true, totalIndexed: total };

        } catch (error) {
            console.error('Error en populateDataInIndex:', error);
            throw error;
        }
    }
}

export default PineconeIndexer;