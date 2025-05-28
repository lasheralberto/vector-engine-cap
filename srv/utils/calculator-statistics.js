export class AdvancedDifferenceComparator {
    constructor(data) {
        this.items = data.results || data;
        this.numericFields = this._extractNumericFields();
        this.normalizedData = this._normalizeData();
        this.statistics = this._calculateStatistics();
    }

    // Extraer solo campos numéricos dinámicamente
    _extractNumericFields() {
        const fields = new Set();

        this.items.forEach((item) => {
            const metadata = item.metadata || item;
            Object.entries(metadata).forEach(([key, value]) => {
                if (
                    typeof value === "number" &&
                    !isNaN(value) &&
                    isFinite(value)
                ) {
                    fields.add(key);
                }
            });
        });

        return Array.from(fields);
    }

    // Normalizar todos los datos numéricos
    _normalizeData() {
        const ranges = this._calculateRanges();

        return this.items.map((item) => {
            const metadata = item.metadata || item;
            const normalized = {};

            this.numericFields.forEach((field) => {
                const value = metadata[field];
                if (typeof value === "number" && ranges[field]) {
                    const { min, max } = ranges[field];
                    normalized[field] =
                        max !== min ? (value - min) / (max - min) : 0.5;
                } else {
                    normalized[field] = null;
                }
            });

            return {
                id: item.id,
                original: metadata,
                normalized: normalized,
                vector: this.numericFields.map(
                    (field) => normalized[field] || 0,
                ),
            };
        });
    }

    // Calcular rangos para normalización
    _calculateRanges() {
        const ranges = {};

        this.numericFields.forEach((field) => {
            const values = this.items
                .map((item) => (item.metadata || item)[field])
                .filter((val) => typeof val === "number" && !isNaN(val));

            if (values.length > 0) {
                ranges[field] = {
                    min: Math.min(...values),
                    max: Math.max(...values),
                    mean:
                        values.reduce((sum, val) => sum + val, 0) /
                        values.length,
                    median: this._calculateMedian(values),
                    std: this._calculateStandardDeviation(values),
                };
            }
        });

        return ranges;
    }

    // Calcular estadísticas descriptivas
    _calculateStatistics() {
        const ranges = this._calculateRanges();
        const correlations = this._calculateCorrelationMatrix();

        return {
            ranges,
            correlations,
            dimensionality: this.numericFields.length,
        };
    }

    // Utilidades matemáticas
    _calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    _calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance =
            values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
            values.length;
        return Math.sqrt(variance);
    }

    // Matriz de correlación
    _calculateCorrelationMatrix() {
        const correlations = {};

        for (let i = 0; i < this.numericFields.length; i++) {
            const field1 = this.numericFields[i];
            correlations[field1] = {};

            for (let j = 0; j < this.numericFields.length; j++) {
                const field2 = this.numericFields[j];
                correlations[field1][field2] = this._pearsonCorrelation(
                    field1,
                    field2,
                );
            }
        }

        return correlations;
    }

    _pearsonCorrelation(field1, field2) {
        const pairs = this.items
            .map((item) => {
                const meta = item.metadata || item;
                return [meta[field1], meta[field2]];
            })
            .filter(([a, b]) => typeof a === "number" && typeof b === "number");

        if (pairs.length < 2) return 0;

        const n = pairs.length;
        const sum1 = pairs.reduce((sum, [a]) => sum + a, 0);
        const sum2 = pairs.reduce((sum, [, b]) => sum + b, 0);
        const sum1Sq = pairs.reduce((sum, [a]) => sum + a * a, 0);
        const sum2Sq = pairs.reduce((sum, [, b]) => sum + b * b, 0);
        const sumProducts = pairs.reduce((sum, [a, b]) => sum + a * b, 0);

        const numerator = n * sumProducts - sum1 * sum2;
        const denominator = Math.sqrt(
            (n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2),
        );

        return denominator === 0 ? 0 : numerator / denominator;
    }

    // Distancias
    _euclideanDistance(vector1, vector2) {
        if (vector1.length !== vector2.length) return Infinity;
        return Math.sqrt(
            vector1.reduce((sum, val, idx) => {
                const diff = val - vector2[idx];
                return sum + diff * diff;
            }, 0),
        );
    }

    _manhattanDistance(vector1, vector2) {
        if (vector1.length !== vector2.length) return Infinity;
        return vector1.reduce((sum, val, idx) => {
            return sum + Math.abs(val - vector2[idx]);
        }, 0);
    }

    // Formatear números
    _formatNumber(num, decimals = 4) {
        if (typeof num !== "number" || !isFinite(num)) return "N/A";
        return Number(num.toFixed(decimals));
    }

    // ========== ANÁLISIS DE DIFERENCIAS ==========

    // Comparación directa entre dos elementos específicos
    compareElements(id1, id2) {
        const element1 = this.normalizedData.find((item) => item.id === id1);
        const element2 = this.normalizedData.find((item) => item.id === id2);

        if (!element1 || !element2) {
            throw new Error("Uno o ambos elementos no encontrados");
        }

        const differences = [];
        const similarities = [];

        this.numericFields.forEach((field) => {
            const val1 = element1.original[field];
            const val2 = element2.original[field];
            const norm1 = element1.normalized[field];
            const norm2 = element2.normalized[field];

            if (typeof val1 === "number" && typeof val2 === "number") {
                const absoluteDiff = Math.abs(val1 - val2);
                const relativeDiff =
                    val1 !== 0 ? Math.abs((val2 - val1) / val1) * 100 : 0;
                const normalizedDiff = Math.abs(norm1 - norm2);

                const comparison = {
                    field: field,
                    value1: val1,
                    value2: val2,
                    absoluteDifference: this._formatNumber(absoluteDiff),
                    relativePercentage: this._formatNumber(relativeDiff),
                    normalizedDifference: this._formatNumber(normalizedDiff),
                    winner: val1 > val2 ? id1 : id2,
                    significantDifference: normalizedDiff > 0.2, // Umbral para diferencias significativas
                };

                if (comparison.significantDifference) {
                    differences.push(comparison);
                } else {
                    similarities.push(comparison);
                }
            }
        });

        // Ordenar por diferencia normalizada (más diferentes primero)
        differences.sort(
            (a, b) => b.normalizedDifference - a.normalizedDifference,
        );
        similarities.sort(
            (a, b) => a.normalizedDifference - b.normalizedDifference,
        );

        return {
            element1: id1,
            element2: id2,
            totalFields: this.numericFields.length,
            significantDifferences: differences.length,
            similarities: similarities.length,
            overallDistance: this._formatNumber(
                this._euclideanDistance(element1.vector, element2.vector),
            ),
            majorDifferences: differences.slice(0, 10), // Top 10 diferencias
            topSimilarities: similarities.slice(0, 5), // Top 5 similitudes
        };
    }

    // Análisis de extremos por campo
    getFieldExtremes() {
        const extremes = {};

        this.numericFields.forEach((field) => {
            const values = this.items
                .map((item) => ({
                    id: item.id,
                    value: (item.metadata || item)[field],
                }))
                .filter((item) => typeof item.value === "number");

            if (values.length > 0) {
                values.sort((a, b) => a.value - b.value);

                const range = this.statistics.ranges[field];
                const q1Index = Math.floor(values.length * 0.25);
                const q3Index = Math.floor(values.length * 0.75);

                extremes[field] = {
                    minimum: {
                        id: values[0].id,
                        value: values[0].value,
                    },
                    maximum: {
                        id: values[values.length - 1].id,
                        value: values[values.length - 1].value,
                    },
                    firstQuartile: {
                        id: values[q1Index].id,
                        value: values[q1Index].value,
                    },
                    thirdQuartile: {
                        id: values[q3Index].id,
                        value: values[q3Index].value,
                    },
                    range: this._formatNumber(range.max - range.min),
                    coefficientVariation: this._formatNumber(
                        (range.std / range.mean) * 100,
                    ),
                    spread:
                        range.max - range.min > range.mean ? "ALTA" : "BAJA",
                };
            }
        });

        return extremes;
    }

    // Análisis de patrones de diferenciación
    getDifferentiationPatterns() {
        const patterns = {
            highVariabilityFields: [],
            lowVariabilityFields: [],
            discriminantFields: [],
            redundantFields: [],
        };

        this.numericFields.forEach((field) => {
            const range = this.statistics.ranges[field];
            const cv = (range.std / range.mean) * 100;

            // Clasificar por variabilidad
            if (cv > 30) {
                patterns.highVariabilityFields.push({
                    field: field,
                    coefficientVariation: this._formatNumber(cv),
                    spread: this._formatNumber(range.max - range.min),
                });
            } else if (cv < 10) {
                patterns.lowVariabilityFields.push({
                    field: field,
                    coefficientVariation: this._formatNumber(cv),
                    spread: this._formatNumber(range.max - range.min),
                });
            }

            // Encontrar campos discriminantes (con alta capacidad de diferenciación)
            const normalizedSpread = (range.max - range.min) / range.mean;
            if (normalizedSpread > 1 && cv > 20) {
                patterns.discriminantFields.push({
                    field: field,
                    discriminationPower: this._formatNumber(
                        normalizedSpread * cv,
                    ),
                    coefficientVariation: this._formatNumber(cv),
                });
            }
        });

        // Encontrar campos redundantes (altamente correlacionados)
        const highCorrelations = [];
        this.numericFields.forEach((field1) => {
            this.numericFields.forEach((field2) => {
                if (field1 < field2) {
                    const correlation = Math.abs(
                        this.statistics.correlations[field1][field2],
                    );
                    if (correlation > 0.8) {
                        highCorrelations.push({
                            field1: field1,
                            field2: field2,
                            correlation: this._formatNumber(correlation, 3),
                        });
                    }
                }
            });
        });

        patterns.redundantFields = highCorrelations;

        // Ordenar por poder discriminante
        patterns.discriminantFields.sort(
            (a, b) => b.discriminationPower - a.discriminationPower,
        );
        patterns.highVariabilityFields.sort(
            (a, b) => b.coefficientVariation - a.coefficientVariation,
        );

        return patterns;
    }

    // Matriz de distancias entre todos los elementos
    getDistanceMatrix(distanceType = "euclidean") {
        const matrix = {};
        const distances = [];

        this.normalizedData.forEach((item1) => {
            matrix[item1.id] = {};

            this.normalizedData.forEach((item2) => {
                if (item1.id !== item2.id) {
                    let distance;
                    switch (distanceType) {
                        case "euclidean":
                            distance = this._euclideanDistance(
                                item1.vector,
                                item2.vector,
                            );
                            break;
                        case "manhattan":
                            distance = this._manhattanDistance(
                                item1.vector,
                                item2.vector,
                            );
                            break;
                        default:
                            distance = this._euclideanDistance(
                                item1.vector,
                                item2.vector,
                            );
                    }
                    matrix[item1.id][item2.id] = this._formatNumber(distance);
                    distances.push(distance);
                } else {
                    matrix[item1.id][item2.id] = 0;
                }
            });
        });

        return {
            matrix: matrix,
            statistics: {
                minDistance: this._formatNumber(Math.min(...distances)),
                maxDistance: this._formatNumber(Math.max(...distances)),
                avgDistance: this._formatNumber(
                    distances.reduce((sum, d) => sum + d, 0) / distances.length,
                ),
                medianDistance: this._formatNumber(
                    this._calculateMedian(distances),
                ),
            },
        };
    }

    // Encontrar los pares más similares y más diferentes
    getMostSimilarAndDifferent(limit = 5) {
        const comparisons = [];

        for (let i = 0; i < this.normalizedData.length; i++) {
            for (let j = i + 1; j < this.normalizedData.length; j++) {
                const item1 = this.normalizedData[i];
                const item2 = this.normalizedData[j];
                const distance = this._euclideanDistance(
                    item1.vector,
                    item2.vector,
                );

                comparisons.push({
                    pair: [item1.id, item2.id],
                    distance: this._formatNumber(distance),
                    similarity: this._formatNumber(1 / (1 + distance)),
                });
            }
        }

        comparisons.sort((a, b) => a.distance - b.distance);

        return {
            mostSimilar: comparisons.slice(0, limit),
            mostDifferent: comparisons.slice(-limit).reverse(),
        };
    }

    // Reporte completo de diferencias
    getCompleteDifferenceReport() {
        const fieldExtremes = this.getFieldExtremes();
        const patterns = this.getDifferentiationPatterns();
        const distanceMatrix = this.getDistanceMatrix();
        const similarityAnalysis = this.getMostSimilarAndDifferent();

        // Estadísticas básicas
        const basicStats = {};
        this.numericFields.forEach((field) => {
            const range = this.statistics.ranges[field];
            if (range) {
                basicStats[field] = {
                    min: this._formatNumber(range.min),
                    max: this._formatNumber(range.max),
                    mean: this._formatNumber(range.mean),
                    std: this._formatNumber(range.std),
                    cv: this._formatNumber((range.std / range.mean) * 100),
                    range: this._formatNumber(range.max - range.min),
                };
            }
        });

        return {
            summary: {
                totalElements: this.items.length,
                numericFields: this.numericFields.length,
                totalComparisons:
                    (this.items.length * (this.items.length - 1)) / 2,
                avgDistanceBetweenElements:
                    distanceMatrix.statistics.avgDistance,
            },
            fieldAnalysis: {
                basicStatistics: basicStats,
                extremeValues: fieldExtremes,
                differentiationPatterns: patterns,
            },
            elementComparisons: {
                distanceStatistics: distanceMatrix.statistics,
                mostSimilarPairs: similarityAnalysis.mostSimilar,
                mostDifferentPairs: similarityAnalysis.mostDifferent,
            },
            correlationInsights: this._getTopCorrelations(),
            recommendedComparisons: this._getRecommendedComparisons(),
        };
    }

    // Obtener las correlaciones más importantes
    _getTopCorrelations() {
        const correlations = [];

        this.numericFields.forEach((field1) => {
            this.numericFields.forEach((field2) => {
                if (field1 < field2) {
                    const corr = this.statistics.correlations[field1][field2];
                    correlations.push({
                        fields: [field1, field2],
                        correlation: this._formatNumber(corr, 3),
                        strength:
                            Math.abs(corr) > 0.7
                                ? "FUERTE"
                                : Math.abs(corr) > 0.4
                                  ? "MODERADA"
                                  : "DÉBIL",
                        direction: corr > 0 ? "POSITIVA" : "NEGATIVA",
                    });
                }
            });
        });

        return correlations
            .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
            .slice(0, 10);
    }

    // Sugerir comparaciones interesantes
    _getRecommendedComparisons() {
        const patterns = this.getDifferentiationPatterns();
        const extremes = this.getFieldExtremes();

        const recommendations = [];

        // Recomendar comparar extremos en campos discriminantes
        patterns.discriminantFields.slice(0, 3).forEach((field) => {
            const fieldExtremes = extremes[field.field];
            if (fieldExtremes) {
                recommendations.push({
                    type: "EXTREMOS",
                    field: field.field,
                    elements: [
                        fieldExtremes.minimum.id,
                        fieldExtremes.maximum.id,
                    ],
                    reason: `Campo con alto poder discriminante (${field.discriminationPower})`,
                });
            }
        });

        return recommendations;
    }

    // Imprimir reporte de diferencias
    printDifferenceReport() {
        const report = this.getCompleteDifferenceReport();

        console.log("=".repeat(80));
        console.log(
            "REPORTE DE ANÁLISIS DE DIFERENCIAS - COMPARACIÓN DINÁMICA",
        );
        console.log("=".repeat(80));

        console.log(`\n📊 RESUMEN GENERAL:`);
        console.log(`   Total elementos: ${report.summary.totalElements}`);
        console.log(`   Campos numéricos: ${report.summary.numericFields}`);
        console.log(
            `   Comparaciones posibles: ${report.summary.totalComparisons}`,
        );
        console.log(
            `   Distancia promedio entre elementos: ${report.summary.avgDistanceBetweenElements}`,
        );

        console.log(`\n🎯 CAMPOS MÁS DISCRIMINANTES:`);
        report.fieldAnalysis.differentiationPatterns.discriminantFields
            .slice(0, 5)
            .forEach((field, idx) => {
                console.log(
                    `   ${idx + 1}. ${field.field}: Poder=${field.discriminationPower}, CV=${field.coefficientVariation}%`,
                );
            });

        console.log(`\n📈 CAMPOS CON MAYOR VARIABILIDAD:`);
        report.fieldAnalysis.differentiationPatterns.highVariabilityFields
            .slice(0, 5)
            .forEach((field, idx) => {
                console.log(
                    `   ${idx + 1}. ${field.field}: CV=${field.coefficientVariation}%, Rango=${field.spread}`,
                );
            });

        console.log(`\n🔗 CORRELACIONES MÁS FUERTES:`);
        report.correlationInsights.slice(0, 5).forEach((corr, idx) => {
            console.log(
                `   ${idx + 1}. ${corr.fields[0]} ↔ ${corr.fields[1]}: ${corr.correlation} (${corr.strength})`,
            );
        });

        console.log(`\n👯 ELEMENTOS MÁS SIMILARES:`);
        report.elementComparisons.mostSimilarPairs.forEach((pair, idx) => {
            console.log(
                `   ${idx + 1}. ${pair.pair[0]} ↔ ${pair.pair[1]}: Distancia=${pair.distance}, Similitud=${pair.similarity}`,
            );
        });

        console.log(`\n🥊 ELEMENTOS MÁS DIFERENTES:`);
        report.elementComparisons.mostDifferentPairs.forEach((pair, idx) => {
            console.log(
                `   ${idx + 1}. ${pair.pair[0]} ↔ ${pair.pair[1]}: Distancia=${pair.distance}, Similitud=${pair.similarity}`,
            );
        });

        console.log(`\n⚡ COMPARACIONES RECOMENDADAS:`);
        report.recommendedComparisons.forEach((rec, idx) => {
            console.log(
                `   ${idx + 1}. Comparar ${rec.elements[0]} vs ${rec.elements[1]}`,
            );
            console.log(`      Campo: ${rec.field}, Motivo: ${rec.reason}`);
        });

        if (
            report.fieldAnalysis.differentiationPatterns.redundantFields
                .length > 0
        ) {
            console.log(`\n🔄 CAMPOS POTENCIALMENTE REDUNDANTES:`);
            report.fieldAnalysis.differentiationPatterns.redundantFields
                .slice(0, 3)
                .forEach((redundant, idx) => {
                    console.log(
                        `   ${idx + 1}. ${redundant.field1} ↔ ${redundant.field2}: r=${redundant.correlation}`,
                    );
                });
        }

        console.log("=".repeat(80));

        return report;
    }
}
