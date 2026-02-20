
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

// Force dynamic to ensure we get fresh data
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        // 1. Get User/Session (Optional, for context)
        const session = await getSession();

        // 2. Parse Body
        const { message, history } = await req.json();
        if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

        // 3. Init AI Provider
        // Fetch from DB first (Settings Page), then fallback to .env
        const openRouterConfig = await prisma.siteContent.findUnique({ where: { slug: 'openrouter_api_key' } });
        const geminiConfig = await prisma.siteContent.findUnique({ where: { slug: 'gemini_api_key' } });

        const openRouterKey = openRouterConfig?.content || process.env.OPENROUTER_API_KEY;
        const geminiKey = geminiConfig?.content || process.env.GEMINI_API_KEY;

        let responseText = '';

        // 4. Fetch Context (Products & FAQs)
        // Optimization: Cache this or limit fields
        const products = await prisma.product.findMany({
            where: { isActive: true, isDeleted: false },
            select: {
                name: true,
                category: { select: { name: true } },
                variants: {
                    where: { isActive: true },
                    take: 1,
                    orderBy: { price: 'asc' },
                    select: { price: true }
                }
            },
            take: 20
        });

        const faqs = await prisma.siteContent.findUnique({ where: { slug: 'faq' } });
        const whatsapp = await prisma.siteContent.findUnique({ where: { slug: 'contact_whatsapp' } });
        const waLink = whatsapp?.content ? `https://wa.me/${whatsapp.content}` : '#';

        // 5. Build System Prompt
        const productList = products.map(p => {
            const price = p.variants[0]?.price ? Number(p.variants[0].price) : 0;
            return `- ${p.name} (${p.category.name}): Mulai Rp ${price.toLocaleString('id-ID')}`;
        }).join('\n');

        const systemPrompt = `
        You are "Bot Toko", a helpful, friendly, and polite customer service AI for a Digital Product Store.
        
        CONTEXT:
        - Store Name: Digital Store
        - WhatsApp Admin: ${waLink}
        - Products Available:
        ${productList}
        - FAQs:
        ${faqs?.content || 'No FAQ available.'}

        RULES:
        1. Answer in Bahasa Indonesia (gaul/santai tapi sopan).
        2. Keep answers short and concise (max 2-3 sentences).
        3. If you don't know, suggest contacting Admin via WhatsApp.
        4. Do NOT hallucinate prices or products not in the list.
        5. If user asks to buy, tell them to click the product card or contact Admin.
        
        User: ${message}
        `;

        if (openRouterKey) {
            // Use OpenRouter (DeepSeek/Llama/etc)
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                    'X-Title': 'Digital Store Bot'
                },
                body: JSON.stringify({
                    model: 'deepseek/deepseek-chat', // Minimal cost, good performance
                    messages: [
                        { role: 'system', content: systemPrompt },
                        // { role: 'user', content: message } // System prompt already contains user message
                    ]
                })
            });
            const data = await res.json();
            responseText = data.choices?.[0]?.message?.content || 'Maaf, saya sedang gangguan.';
        } else if (geminiKey) {
            // Fallback to Gemini
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            const chat = model.startChat({
                history: history || [],
                generationConfig: { maxOutputTokens: 200 },
            });
            const result = await chat.sendMessage(systemPrompt);
            responseText = result.response.text();
        } else {
            return NextResponse.json({ error: 'AI Service Unavailable' }, { status: 503 });
        }

        return NextResponse.json({ reply: responseText });

    } catch (error) {
        console.error('AI Chat Error:', error);
        return NextResponse.json({ error: 'Internal AI Error' }, { status: 500 });
    }
}
