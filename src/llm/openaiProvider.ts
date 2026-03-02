import OpenAI from 'openai';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { IntentSchema, type Intent } from './schemas';
import type { LLMProvider, } from './provider';
import type { LLMMessage } from './prompt';

const client = new OpenAI({ apiKey: config.openaiApiKey });

export const openaiProvider: LLMProvider = {
  async classify(messages: LLMMessage[]): Promise<Intent> {
    const response = await client.chat.completions.create({
      model: config.openaiModel,
      temperature: config.llmTemperature,
      response_format: { type: 'json_object' },
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const raw = response.choices[0]?.message?.content ?? '{}';

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.warn({ raw }, 'LLM returned non-JSON');
      return { intent: 'UNKNOWN', message: 'Could not parse response' };
    }

    const result = IntentSchema.safeParse(parsed);
    if (!result.success) {
      logger.warn({ raw, errors: result.error.format() }, 'LLM output failed Zod validation');
      return { intent: 'UNKNOWN', message: 'Invalid response structure' };
    }

    return result.data;
  },
};
