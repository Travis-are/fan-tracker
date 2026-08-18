import 'server-only';
import { geminiProvider } from '@/lib/ai/gemini';
import type { AiProvider } from '@/lib/ai/provider';

// Single point of provider selection. To add another LLM later:
// 1. Create src/lib/ai/<provider>.ts implementing AiProvider
// 2. Swap the export below (or branch on an env var)
export const aiProvider: AiProvider = geminiProvider;

export type * from '@/lib/ai/provider';
