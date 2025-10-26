import OpenAI from 'openai';

class OpenAIService {
    private client: OpenAI | null = null;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey && apiKey !== 'your-openai-key') {
            this.client = new OpenAI({ apiKey });
            console.log('✅ OpenAI service initialized');
        } else {
            console.warn('⚠️  OpenAI API key not configured');
        }
    }

    async generateResponse(prompt: string): Promise<string> {
        if (!this.client) {
            throw new Error('OpenAI not initialized');
        }

        try {
            const response = await this.client.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            });

            return response.choices[0].message.content || 'No response';
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw error;
        }
    }

    async analyzeMarketData(data: any): Promise<string> {
        const prompt = `Analyze this market data and provide trading insights:
    
Symbol: ${data.symbol}
Price: $${data.price}
24h Change: ${data.change24h}%
Volume: ${data.volume}

Provide a brief analysis and recommendation.`;

        return this.generateResponse(prompt);
    }
}

export const openaiService = new OpenAIService();