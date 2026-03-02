import { config } from '../utils/config';
import type { Intent } from './schemas';
import type { LLMMessage } from './prompt';

export interface LLMProvider {
  classify(messages: LLMMessage[]): Promise<Intent>;
}

let _provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (_provider) return _provider;

  if (config.llmProvider === 'openai') {
    const { openaiProvider } = require('./openaiProvider');
    _provider = openaiProvider;
  } else {
    throw new Error(`Unknown LLM provider: ${config.llmProvider}`);
  }

  return _provider!;
}

export async function classifyIntent(messages: LLMMessage[]): Promise<Intent> {
  return getLLMProvider().classify(messages);
}
