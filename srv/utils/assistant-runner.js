class AssistantFilter {
    constructor(client, apiKey) {
        this.client = client;
        this.apiKey = apiKey;
    }

    static async getAssistantByName(client, name) {
        if (!name) {
            throw new Error("El nombre del asistente es requerido.");
        }
        if(!client){
            throw new Error("El cliente OpenAI es requerido.");
        }
        
        let assistantsList = null;
        try {
            assistantsList = await client.beta.assistants.list();
        } catch (e) {
            throw new Error("Error al obtener la lista de asistentes: " + e.message);
        }


        return assistantsList.data.find((a) => a.name === name) || null;
    }

    static async createThreadAndRun(client, assistantId, userInput) {
        const thread = await client.beta.threads.create();
        await AssistantFilter.submitMessage(client, assistantId, thread.id, userInput);
        const run = await client.beta.threads.runs.createAndPoll(thread.id, {
            assistant_id: assistantId,
        });
        return { thread, run };
    }

    static async submitMessage(client, assistantId, threadId, userMessage) {
        await client.beta.threads.messages.create(threadId, {
            role: "user",
            content: userMessage,
        });
    }

    static async waitOnRun(client, run, thread) {
        while (run.status !== "completed") {
            await new Promise((resolve) => setTimeout(resolve, 500));
            run = await client.beta.threads.runs.retrieve({
                thread_id: thread.id,
                run_id: run.id,
            });
        }
        return run;
    }

    static async getResponse(client, thread) {
        const messages = await client.beta.threads.messages.list(thread.id);
        return messages;
    }

    static extractAnswer(messages) {
        for (const m of messages.data) {
            if (m.role === "assistant") {
                const raw = m.content[0]?.text?.value;
                return raw || "";
            }
        }
        return "";
    }

    async runQueryToAssistant(assistantName, query) {
        const assistant = await AssistantFilter.getAssistantByName(this.client, assistantName);

        if (!assistant) {
            throw new Error(`Asistente '${assistantName}' no encontrado.`);
        }
        
        console.log("Query a enviar al asistente:", query);
        const { thread, run } = await AssistantFilter.createThreadAndRun(this.client, assistant.id, query);

        await AssistantFilter.waitOnRun(this.client, run, thread);
        const messages = await AssistantFilter.getResponse(this.client, thread);
        let answer = AssistantFilter.extractAnswer(messages);

        if (answer.trim().startsWith("'''json") || answer.trim().startsWith("```json")) {
            answer = answer
                .replace(/^(```|''')json\s*/, "")
                .replace(/(```|''')\s*$/, "")
                .trim();
        }

        try {
            console.log("Respuesta OPENAI Filtros:", answer);
            return JSON.parse(answer);
        } catch (e) {
            throw new Error("Respuesta no es JSON válido: " + answer);
        }
    }
}

export default AssistantFilter;