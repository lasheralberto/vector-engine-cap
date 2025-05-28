import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


export default class VectorEngineUtils {
    static _config = null;

    static async getConfiguration(configId) {
        if (!this._config) {

            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);

            const configPath = path.join(__dirname, "../resources/resources.json");

            try {
                const rawData = await fs.readFile(configPath, 'utf8');
                this._config = JSON.parse(rawData);
            } catch (error) {
                console.error("Error loading configuration:", error);
                throw new Error("Configuration file not found or invalid");
            }
        }

        return this._config[configId] || null;
    }
}