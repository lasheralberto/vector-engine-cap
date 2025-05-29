/**
 * Realiza la comparación de registros con columnas dinámicas
 * @param {Array} records - Array de registros a comparar
 * @param {Array} columnsToCompare - Array de nombres de columnas a comparar
 * @param {Object} options - Opciones adicionales para la comparación
 * @returns {Object} Resultado de la comparación con colores
 */

export   class ComparatorAlgorithm {
    performComparison(records, columnsToCompare, options = {}) {
        if (records.length === 0) {
            return {
                comparedRecords: [],
                columnAnalysis: {},
                summary: "No hay registros para comparar"
            };
        }

        // Validar que todas las columnas especificadas existen en los registros
        const availableColumns = Object.keys(records[0]);
        const validColumns = columnsToCompare.filter(col => {
            const exists = availableColumns.includes(col);
            if (!exists) {
                console.warn(`Columna '${col}' no encontrada en los registros. Columnas disponibles: ${availableColumns.join(', ')}`);
            }
            return exists;
        });

        if (validColumns.length === 0) {
            return {
                comparedRecords: records,
                columnAnalysis: {},
                error: "Ninguna de las columnas especificadas existe en los registros",
                summary: "No se pudo realizar la comparación - columnas no válidas"
            };
        }

        // Configuración de opciones
        const config = {
            predominantThreshold: options.predominantThreshold || 0.5, // 50% por defecto
            ignoreNullValues: options.ignoreNullValues !== false, // true por defecto
            caseSensitive: options.caseSensitive !== false, // true por defecto
            ...options
        };

        // Analizar cada columna especificada
        const columnAnalysis = {};
        const colorMapping = this.generateColorMapping();

        validColumns.forEach(column => {
            let values = records.map(record => record[column]);

            // Filtrar valores nulos si está configurado
            if (config.ignoreNullValues) {
                values = values.filter(val => val !== null && val !== undefined && val !== '');
            }

            // Normalizar valores para comparación si no es case sensitive
            let normalizedValues = values;
            if (!config.caseSensitive && typeof values[0] === 'string') {
                normalizedValues = values.map(val =>
                    typeof val === 'string' ? val.toLowerCase() : val
                );
            }

            const uniqueValues = [...new Set(normalizedValues)];
            const valueFrequency = this.getValueFrequency(normalizedValues);

            columnAnalysis[column] = {
                totalRecords: records.length,
                validValues: values.length,
                uniqueValues: uniqueValues.length,
                shouldHighlight: uniqueValues.length < values.length && values.length > 1, // Hay valores repetidos
                valueFrequency: valueFrequency,
                predominantValue: this.getPredominantValue(normalizedValues),
                hasPredominantValue: this.hasPredominantValue(valueFrequency, config.predominantThreshold),
                originalValues: [...new Set(values)] // Valores originales sin normalizar
            };
        });

        // Crear registros con información de colores
        const comparedRecords = records.map((record, index) => {
            const recordWithColors = {
                ...record,
                _rowIndex: index,
                _columnColors: {},
                _comparisonMetadata: {
                    recordId: record.id || record.ID || `record_${index}`,
                    timestamp: new Date().toISOString()
                }
            };

            validColumns.forEach(column => {
                const currentValue = record[column];
                const analysis = columnAnalysis[column];

                // Solo procesar si hay algo que marcar
                if (!analysis.shouldHighlight || !currentValue) {
                    return;
                }

                const normalizedCurrentValue = !config.caseSensitive && typeof currentValue === 'string'
                    ? currentValue.toLowerCase()
                    : currentValue;

                // Escenario 1: Hay valor predominante - marcar toda la columna
                if (analysis.hasPredominantValue) {
                    recordWithColors._columnColors[column] = {
                        backgroundColor: colorMapping.predominant,
                        textColor: '#2F4F2F',
                        reason: `Valor predominante: ${analysis.predominantValue}`,
                        scenario: 1,
                        frequency: analysis.valueFrequency[normalizedCurrentValue] || 0,
                        percentage: Math.round(((analysis.valueFrequency[normalizedCurrentValue] || 0) / analysis.validValues) * 100)
                    };
                } else {
                    // Escenario 2: Marcar solo las celdas con valores que se repiten
                    if (analysis.valueFrequency[normalizedCurrentValue] > 1) {
                        recordWithColors._columnColors[column] = {
                            backgroundColor: this.getColorForValue(normalizedCurrentValue, colorMapping),
                            textColor: '#333333',
                            reason: `Valor repetido: ${currentValue} (aparece ${analysis.valueFrequency[normalizedCurrentValue]} veces)`,
                            scenario: 2,
                            frequency: analysis.valueFrequency[normalizedCurrentValue],
                            percentage: Math.round((analysis.valueFrequency[normalizedCurrentValue] / analysis.validValues) * 100)
                        };
                    }
                }
            });

            return recordWithColors;
        });

        return {
            comparedRecords,
            columnAnalysis,
            colorMapping,
            configuration: config,
            summary: this.generateSummary(records.length, columnAnalysis, validColumns),
            metadata: {
                totalRecords: records.length,
                requestedColumns: columnsToCompare.length,
                validColumns: validColumns.length,
                invalidColumns: columnsToCompare.filter(col => !validColumns.includes(col)),
                columnsWithRepeatedValues: validColumns.filter(col =>
                    columnAnalysis[col] && columnAnalysis[col].shouldHighlight
                ),
                availableColumns: availableColumns
            }
        };
    }

    /**
     * Calcula la frecuencia de cada valor en un array
     */
    getValueFrequency(values) {
        return values.reduce((freq, value) => {
            freq[value] = (freq[value] || 0) + 1;
            return freq;
        }, {});
    }

    /**
     * Obtiene el valor que más se repite
     */
    getPredominantValue(values) {
        const frequency = this.getValueFrequency(values);
        return Object.keys(frequency).reduce((a, b) =>
            frequency[a] > frequency[b] ? a : b
        );
    }

    /**
     * Determina si hay un valor predominante basado en el threshold configurado
     */
    hasPredominantValue(valueFrequency, threshold = 0.5) {
        const totalValues = Object.values(valueFrequency).reduce((sum, count) => sum + count, 0);
        const maxFrequency = Math.max(...Object.values(valueFrequency));
        return maxFrequency > totalValues * threshold;
    }

    /**
     * Genera un mapeo de colores para la comparación
     */
    generateColorMapping() {
        return {
            predominant: '#90EE90',    // Verde claro para valores predominantes
            repeated1: '#FFE4E1',     // Rosa claro
            repeated2: '#E0E6FF',     // Azul claro
            repeated3: '#FFF8DC',     // Amarillo claro
            repeated4: '#F0E68C',     // Khaki
            repeated5: '#DDA0DD',     // Plum
            default: '#F5F5F5'        // Gris muy claro
        };
    }

    /**
     * Asigna un color específico basado en el valor
     */
    getColorForValue(value, colorMapping) {
        const colors = ['repeated1', 'repeated2', 'repeated3', 'repeated4', 'repeated5'];
        const hash = String(value).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        const colorIndex = Math.abs(hash) % colors.length;
        return colorMapping[colors[colorIndex]];
    }

    /**
     * Genera un resumen de la comparación
     */
    generateSummary(totalRecords, columnAnalysis, validColumns) {
        const columnsWithRepeats = validColumns.filter(col =>
            columnAnalysis[col] && columnAnalysis[col].shouldHighlight
        );

        if (columnsWithRepeats.length === 0) {
            return `Se compararon ${totalRecords} registros en ${validColumns.length} columna(s). No se encontraron valores repetidos.`;
        }

        const detailsPerColumn = columnsWithRepeats.map(col => {
            const analysis = columnAnalysis[col];
            const scenario = analysis.hasPredominantValue ? "predominante" : "repetidos";
            return `${col} (${scenario})`;
        });

        return `Se compararon ${totalRecords} registros en ${validColumns.length} columna(s). Se encontraron valores ${columnsWithRepeats.length > 1 ? 'en' : 'en'} ${columnsWithRepeats.length} columna(s): ${detailsPerColumn.join(', ')}.`;
    }
}