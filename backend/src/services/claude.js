import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Chamar Claude com modelo específico
export async function callClaude(systemPrompt, userMessage, model = 'claude-3-haiku-20240307') {
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Erro ao chamar Claude:', error);
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
    console.error('Erro ao chamar Claude Vision:', error);
    throw error;
  }
}

export default { callClaude, callClaudeVision };
