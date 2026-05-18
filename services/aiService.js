/**
 * AI Service - Groq Integration
 * Handles AI chat completion with tool calling capability
 */

const { TOOLS } = require('./toolService');
const groqService = require('./groqService');

/**
 * Configuration - Groq
 */
const GROQ_MODEL = process.env.GROQ_MODEL || groqService.DEFAULT_MODEL;

/**
 * System prompt for the chatbot
 * Instructs AI on how to behave
 */
const SYSTEM_PROMPT = `You are SheenClassics AI Assistant, a friendly and helpful chatbot for an ecommerce store specializing in premium embroidered clothing.

**Your Personality:**
- Friendly, professional, and helpful
- Use emojis occasionally for warmth
- Keep responses concise and actionable
- Always provide product links when recommending items

**Your Capabilities:**
You have access to tools to search products, show product details, manage carts, apply coupons, place orders, cancel orders, list orders, and track orders. When a user asks you to perform an action:
1. Use the appropriate tool
2. Don't make up information - only use data from tools
3. Ask for clarification if needed

**Response Format:**
- Start with a relevant emoji if appropriate
- Be natural and conversational
- Whenever you mention or reference a product, use the markdown link provided by the tool, such as [Product Name](https://...)
- Whenever you mention or reference an order, use the markdown order link provided by the tool
- Provide clear next steps

**Important:**
- Never assume product availability - always check with searchProducts or getProductDetails
- When using optional tool fields, omit unknown values instead of sending empty strings
- For price requests like "under 3000", call searchProducts with maxPrice
- For "add this/the first one/that product to cart", use the product from the recent search or ask which product if it is ambiguous
- For checkout/place order, collect WhatsApp number plus shipping street and city; guest users also need name, email, and phone
- Only place an order after the user clearly confirms checkout details
- Cancellation is only possible for pending or processing orders
- Always validate coupon codes before mentioning discounts
- For order tracking, always use getOrderStatus
- Be honest about limitations - if you can't help, say so

Your goal is to provide excellent customer service and drive sales through helpful recommendations.`;

/**
 * Create messages for AI with conversation history
 */
function buildMessages(userMessage, conversationHistory = []) {
    const messages = [
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ];
    return messages;
}

/**
 * Add product context to system prompt for RAG (Retrieval-Augmented Generation)
 */
function buildSystemPromptWithContext(contextData = '') {
    if (contextData) {
        const contextText = typeof contextData === 'string' ? contextData : JSON.stringify(contextData, null, 2);
        return `${SYSTEM_PROMPT}\n\n**Store Context:**\n${contextText}`;
    }
    return SYSTEM_PROMPT;
}

/**
 * Make API call to Groq
 */
async function callGroq(messages, systemPrompt, useTools = true) {
    try {
        const payload = {
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9
        };

        // Add tools if available
        if (useTools) {
            payload.tools = TOOLS.map(tool => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters
                }
            }));
            payload.tool_choice = 'auto';
        }

        console.log('[AI] Calling Groq API...');
        const response = await groqService.createChatCompletion(payload);

        console.log('[AI] Response received successfully');

        return {
            success: true,
            data: response
        };
    } catch (error) {
        console.error('[AI] Error calling Groq:', error.message);

        // Provide helpful error messages
        if (error.response ?.status === 401) {
            return { success: false, error: 'Invalid API key' };
        }
        if (error.response ?.status === 429) {
            return { success: false, error: 'Rate limited - please try again later' };
        }
        if (error.code === 'ECONNABORTED') {
            return { success: false, error: 'Request timeout' };
        }

        return { success: false, error: error.message };
    }
}

/**
 * Extract tool calls from AI response
 * Returns array of { toolName, parameters }
 */
function extractToolCalls(response) {
    const toolCalls = [];

    if (!response.choices || !response.choices[0]) {
        return toolCalls;
    }

    const choice = response.choices[0];
    const message = choice.message;

    // Check for tool calls in tool_calls array (standard format)
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
        for (const toolCall of message.tool_calls) {
            if (toolCall.function) {
                try {
                    const params = typeof toolCall.function.arguments === 'string' ?
                        JSON.parse(toolCall.function.arguments) :
                        toolCall.function.arguments;

                    toolCalls.push({
                        id: toolCall.id,
                        name: toolCall.function.name,
                        arguments: params
                    });
                } catch (e) {
                    console.error('[AI] Error parsing tool arguments:', e);
                }
            }
        }
    }

    return toolCalls;
}

/**
 * Extract assistant message content
 */
function extractAssistantMessage(response) {
    if (!response.choices || !response.choices[0]) {
        return '';
    }

    const content = response.choices[0].message.content;
    return content || '';
}

/**
 * Process one step of AI interaction
 * Handles tool calling and response
 */
async function processAIStep(messages, systemPrompt, useTools = true) {
    const response = await callGroq(messages, systemPrompt, useTools);

    if (!response.success) {
        return { success: false, error: response.error };
    }

    const apiResponse = response.data;
    const toolCalls = extractToolCalls(apiResponse);
    const message = extractAssistantMessage(apiResponse);

    return {
        success: true,
        stop: toolCalls.length === 0, // Stop if no more tool calls
        message,
        toolCalls,
        usage: {
            promptTokens: apiResponse.usage ?.prompt_tokens,
            completionTokens: apiResponse.usage ?.completion_tokens
        }
    };
}

/**
 * Main chat function - handles full conversation flow
 */
async function chat(userMessage, conversationHistory = [], maxIterations = 5, contextData = '', useTools = true) {
    console.log('[AI] Starting chat interaction');

    const messages = buildMessages(userMessage, conversationHistory);
    const systemPrompt = buildSystemPromptWithContext(contextData);
    let iteration = 0;
    let finalMessage = '';

    for (iteration = 0; iteration < maxIterations; iteration++) {
        console.log(`[AI] Iteration ${iteration + 1}/${maxIterations}`);

        const step = await processAIStep(messages, systemPrompt, useTools);

        if (!step.success) {
            console.error('[AI] Step failed:', step.error);
            return {
                success: false,
                error: step.error,
                response: 'I encountered an error. Please try again.'
            };
        }

        // Add assistant message to conversation
        messages.push({ role: 'assistant', content: step.message });
        finalMessage = step.message;

        // If no tool calls, we're done
        if (step.stop) {
            console.log('[AI] Completed - no more tool calls');
            break;
        }

        // Process tool calls
        if (step.toolCalls && step.toolCalls.length > 0) {
            console.log(`[AI] Processing ${step.toolCalls.length} tool calls`);

            for (const toolCall of step.toolCalls) {
                // Tool execution happens in controller
                // We just return the tool calls to be processed there
                console.log(`[AI] Tool call: ${toolCall.name}`);
            }

            return {
                success: true,
                response: finalMessage,
                toolCalls: step.toolCalls,
                requiresToolExecution: true
            };
        }
    }

    if (iteration >= maxIterations) {
        console.warn('[AI] Max iterations reached');
    }

    return {
        success: true,
        response: finalMessage,
        toolCalls: [],
        requiresToolExecution: false
    };
}

/**
 * Check if API is configured
 */
function isConfigured() {
    return groqService.isConfigured();
}

module.exports = {
    chat,
    callGroq,
    extractToolCalls,
    extractAssistantMessage,
    buildMessages,
    buildSystemPromptWithContext,
    isConfigured,
    SYSTEM_PROMPT
};
