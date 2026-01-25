import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Chamar Claude com modelo específico
// Agora suporta histórico de conversa para manter contexto
export async function callClaude(systemPrompt, userMessage, model = 'claude-3-haiku-20240307', conversationHistory = []) {
  try {
    // Construir array de mensagens com histórico
    const messages = [
      // Histórico anterior (últimas mensagens)
      ...conversationHistory
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({ role: msg.role, content: msg.content })),
      // Mensagem atual do usuário
      { role: 'user', content: userMessage }
    ];

    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    return response.content[0].text;
  } catch (error) {
    logger.error({ error, model }, 'Error calling Claude API');
    throw error;
  }
}

// Chamar Claude com imagem (Vision)
export async function callClaudeVision(systemPrompt, imageBase64, mimeType = 'image/jpeg') {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Extraia os dados desta imagem de comprovante financeiro.',
            },
          ],
        },
      ],
    });

    return response.content[0].text;
  } catch (error) {
    logger.error({ error }, 'Error calling Claude Vision API');
    throw error;
  }
}

export default { callClaude, callClaudeVision };
