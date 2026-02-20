
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';

// Helper to get config
// Helper to get config
async function getAIConfig() {
    // Fetch from SiteContent as used in Settings Page
    const configs = await prisma.siteContent.findMany({
        where: {
            slug: { in: ['gemini_api_key', 'openrouter_api_key', 'openrouter_model'] }
        }
    });

    const geminiKey = configs.find(c => c.slug === 'gemini_api_key')?.content || process.env.GEMINI_API_KEY;
    const openRouterKey = configs.find(c => c.slug === 'openrouter_api_key')?.content || process.env.OPENROUTER_API_KEY;
    const openRouterModel = configs.find(c => c.slug === 'openrouter_model')?.content;

    return { geminiKey, openRouterKey, openRouterModel };
}

export async function generateReviews(productName: string, description: string, count: number = 5, variants: string[] = []) {
    const { geminiKey, openRouterKey, openRouterModel } = await getAIConfig();

    const variantsList = variants.length > 0 ? variants.join(', ') : "Standard";

    const systemPrompt = `
        You are an expert Review Generator for an Indonesian Digital Product Marketplace.
        Your task is to generate ${count} REALISTIC, HUMAN-LIKE product reviews in Bahasa Indonesia.
        
        Product: "${productName}"
        Description: "${description}"
        Available Variants: "${variantsList}"

        CRITICAL INSTRUCTIONS:
        1. **Language Style**: Mix of formal, casual, and slang (gaul). Use terms like "gan", "kak", "min", "mantap", "gercep", "recommended".
        2. **Vary Length**: Some short (e.g., "Mantap gan, proses cepat."), some medium with details.
        3. **Authenticity**: Include typos naturally (rarely), emojis (👍, 🔥, ⭐).
        4. **STRICTLY POSITIVE**: Do NOT generate negative reviews. Ratings MUST be 4 or 5 stars only. Focus on speed, trust, and cheap prices.
        5. **Contextual**: If variants are provided, RANDOMLY select one for each review and mention it naturally in the comment.
        6. **NO HALLUCINATIONS**: You MUST choose \`variantName\` value EXACTLY from the "Available Variants" list above. 
           - DO NOT invent new amounts (e.g. do NOT say "360 Diamonds" if it's not in the list).
           - If the list is "Standard", use "Standard".
        7. **REALISTIC NAMES**: Use authentic Indonesian names (e.g. "Rizky Pratama", "Siti Aminah", "Budi Santoso", "Dewi Anggraeni", "Ahmad Zaky"). 
           - **NO NUMBERS**: Usernames MUST NOT contain numbers (e.g. "Budi99" is FORBIDDEN). Use "Budi Santoso" instead.
           - DO NOT use generic names like "User", "Pelanggan", "Anonim", or "Test".
           - Mix: Full names, nicknames, and alay usernames (but NO numbers, e.g. "Putri Cantik").
        8. **NO SPECIFIC PRICES**: You can say "Murah", "Terjangkau", "Paling Murah", but NEVER mention specific numbers (e.g. "10rb", "Rp 50.000").
           - REASON: Prices change dynamically, specific numbers make specific reviews invalid.
        9. **UNIQUE NAMES**: All \`userName\` values in the output array MUST be distinct. Do NOT repeat names.
        
        Output ONLY a valid JSON array of objects with this structure:
        [
            { "userName": "string", "rating": number (4-5), "comment": "string", "variantName": "string (strictly from Available Variants list)" }
        ]
        DO NOT output markdown code blocks. JUST the raw JSON string.
    `;

    let firstOpenRouterError: string | null = null;
    let lastOpenRouterError: string | null = null;

    // 1. Try OpenRouter (Preferred if available)
    if (openRouterKey) {
        // Default reliable free models
        const openRouterModels = [
            'deepseek/deepseek-r1-0528:free',
            'deepseek/deepseek-r1:free',
            'google/gemini-2.0-flash-exp:free',
            'mistralai/mistral-7b-instruct:free'
        ];

        // If custom model is configured, try it FIRST
        if (openRouterModel && !openRouterModels.includes(openRouterModel)) {
            openRouterModels.unshift(openRouterModel);
        } else if (openRouterModel) {
            // If it's already in the list, move it to front
            const idx = openRouterModels.indexOf(openRouterModel);
            if (idx > -1) {
                openRouterModels.splice(idx, 1);
                openRouterModels.unshift(openRouterModel);
            }
        }

        for (const model of openRouterModels) {
            try {
                // console.log(`OpenRouter attempting model: ${model}`);
                const payload: any = {
                    "model": model,
                    "messages": [
                        { "role": "system", "content": systemPrompt },
                        { "role": "user", "content": "Generate reviews now." }
                    ]
                };

                // Add reasoning for specific models if needed (per user request)
                // if (model === 'openai/gpt-oss-120b:free') {
                //     payload.reasoning = { enabled: true };
                // }

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${openRouterKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://hasilkuuy.com",
                        "X-Title": "Market Web"
                    },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(120000) // 120s timeout (DeepSeek R1 is slow)
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = data.choices[0]?.message?.content;
                    return parseJSON(content);
                }

                const errorData = await response.json().catch(() => null);
                const msg = errorData?.error?.message || response.statusText;
                console.warn(`OpenRouter model ${model} failed: ${msg}`);

                if (!firstOpenRouterError) firstOpenRouterError = `OpenRouter (${model}) Error: ${msg}`;
                lastOpenRouterError = `OpenRouter (${model}) Error: ${msg}`;

            } catch (e: any) {
                console.error(`OpenRouter Network Error (${model}):`, e);
                const errMsg = `OpenRouter Network Error: ${e.message}`;
                if (!firstOpenRouterError) firstOpenRouterError = errMsg;
                lastOpenRouterError = errMsg;
            }
        }

        console.warn("All OpenRouter models failed, falling back to Gemini direct...", lastOpenRouterError);
    }

    // 2. Fallback to Gemini Direct (REST API to avoid SDK version issues)
    if (geminiKey) {
        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-1.5-pro-latest',
            'gemini-1.0-pro',
            'gemini-pro'
        ];

        let lastError: any = null;

        for (const modelName of modelsToTry) {
            try {
                // console.log(`Rest API attempting model: ${modelName}`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: systemPrompt }] }],
                        generationConfig: { temperature: 0.9 }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(errorData?.error?.message || `HTTP ${response.status} ${modelName}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) throw new Error(`No content from ${modelName}`);

                return parseJSON(text);

            } catch (e: any) {
                console.warn(`Gemini REST API failed for ${modelName}: ${e.message}`);
                lastError = e;
                // Try next model
            }
        }

        throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError?.toString()}`);
    }

    // Throw the first preference error if it exists, otherwise the last one
    if (firstOpenRouterError || lastOpenRouterError) {
        throw new Error(firstOpenRouterError || lastOpenRouterError!);
    }

    throw new Error("No AI API Keys configured. Please check Admin Settings.");
}

function parseJSON(text: string) {
    try {
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse AI response:", text);
        throw new Error("Invalid JSON from AI. Raw response: " + text.substring(0, 50) + "...");
    }
}
