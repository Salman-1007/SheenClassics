const Groq = require('groq-sdk');

const FALLBACK_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_MODEL = process.env.GROQ_MODEL || FALLBACK_MODEL;

function getClient() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is not configured');
    }

    return new Groq({
        apiKey: process.env.GROQ_API_KEY
    });
}

async function callGroq(messages, systemPrompt = '', maxTokens = 1024, options = {}) {
    const client = getClient();
    const payload = {
        model: options.model || DEFAULT_MODEL,
        messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...messages
        ],
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        tools: options.tools,
        tool_choice: options.tool_choice
    };
    const response = await createWithModelFallback(client, payload);

    return response.choices?.[0]?.message?.content || '';
}

async function createChatCompletion(payload) {
    const client = getClient();
    return createWithModelFallback(client, {
        model: payload.model || DEFAULT_MODEL,
        ...payload
    });
}

async function createWithModelFallback(client, payload) {
    try {
        return await client.chat.completions.create(payload);
    } catch (error) {
        const code = error.error?.error?.code || error.error?.code;
        const message = error.error?.error?.message || error.message || '';
        const canFallback = payload.model !== FALLBACK_MODEL &&
            (code === 'model_decommissioned' || code === 'model_not_found' || /decommissioned|not found|does not exist/i.test(message));

        if (!canFallback) throw error;

        console.warn(`[Groq] Model "${payload.model}" failed (${code || message}). Retrying with "${FALLBACK_MODEL}".`);
        return client.chat.completions.create({
            ...payload,
            model: FALLBACK_MODEL
        });
    }
}

function isConfigured() {
    return Boolean(process.env.GROQ_API_KEY);
}

function parseJsonFromAi(raw) {
    const cleaned = String(raw || '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket > firstBracket && (firstBrace === -1 || firstBracket < firstBrace)) {
        return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    }

    if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }

    return JSON.parse(cleaned);
}

module.exports = {
    callGroq,
    createChatCompletion,
    isConfigured,
    parseJsonFromAi,
    DEFAULT_MODEL,
    FALLBACK_MODEL
};
