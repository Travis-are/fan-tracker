import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AiProvider,
  ClassificationResult,
  EntityResolutionResult,
  SummaryResult,
  ScoreReasoningResult,
} from '@/lib/ai/provider';

const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
}

async function generateJson<T>(prompt: string): Promise<T> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

export const geminiProvider: AiProvider = {
  name: 'gemini',

  async classifyDiscussion(content, knownAliases) {
    const prompt = `You are a strict, literal classifier for a fan-demand intelligence system. Analyze the public post below and respond ONLY with JSON matching this exact shape, no markdown, no preamble:

{
  "isRelevant": boolean,
  "categories": [{"category": "<one of the allowed category strings>", "confidence": 0.0-1.0}],
  "sentiment": {"value": "positive"|"neutral"|"negative"|"frustrated", "confidence": 0.0-1.0},
  "mentionedPublicFigures": ["name1", "name2"],
  "reasoning": "one sentence, factual, no speculation beyond the text"
}

Allowed categories: fan_card_request, fan_card_question, fan_card_waiting, fan_card_complaint, membership_request, fan_club_request, vip_membership, membership_question, meet_greet_want, meet_greet_question, vip_experience_question, fan_event_question, no_response, waiting_for_reply, request_unanswered, asking_for_response, general_frustration, general_confusion, negative_experience, delayed_communication.

Rules:
- isRelevant = false if the post is not about fan cards, memberships, meet-and-greets, or unanswered requests/complaints toward a public figure.
- Only include categories clearly supported by the text. Never guess.
- mentionedPublicFigures: extract names/handles as written, do not normalize or guess a "real" identity.
- Do not fabricate facts not present in the text.

Known aliases already in our system for context (do not force a match if it doesn't fit): ${knownAliases.join(', ') || 'none'}

POST:
"""${content}"""`;

    return generateJson<ClassificationResult>(prompt);
  },

  async resolveEntity(mentionedName, existingCelebrities) {
    const prompt = `You are an entity-resolution assistant. Given a mentioned name/handle and a list of existing tracked public figures, decide if it refers to an existing entry or is a new one. Respond ONLY with JSON:

{
  "canonicalName": "<existing canonical name, or null if new>",
  "isNewEntity": boolean,
  "matchConfidence": 0.0-1.0,
  "reasoning": "one sentence"
}

Rules:
- Only match if you are reasonably confident it's the same real person/entity (accounting for nicknames, misspellings, handles).
- If uncertain, set isNewEntity=true with matchConfidence reflecting your uncertainty rather than guessing a false match.
- Never infer private personal information about the individual.

Mentioned name: "${mentionedName}"

Existing tracked entities:
${existingCelebrities.map((c) => `- ${c.canonicalName} (aliases: ${c.aliases.join(', ') || 'none'})`).join('\n') || 'none'}`;

    return generateJson<EntityResolutionResult>(prompt);
  },

  async generateCelebritySummary(context) {
    const prompt = `You are generating a short AI-analysis summary for a fan-demand intelligence dashboard. Use ONLY the measured data provided below — do not invent statistics or facts not given. Respond ONLY with JSON:

{"summary": "<2-3 sentence summary>", "isAiGenerated": true}

Data:
- Public figure: ${context.name}
- Total relevant discussions: ${context.totalDiscussions}
- Fan card demand: ${context.fanCardPct !== null ? context.fanCardPct + '%' : 'insufficient data'}
- Membership demand: ${context.membershipPct !== null ? context.membershipPct + '%' : 'insufficient data'}
- Meet & greet demand: ${context.meetGreetPct !== null ? context.meetGreetPct + '%' : 'insufficient data'}
- Unanswered request rate: ${context.unansweredPct !== null ? context.unansweredPct + '%' : 'insufficient data'}
- Trend: ${context.trend}

Write in a neutral, analytical tone. If a value is "insufficient data", say so rather than guessing.`;

    return generateJson<SummaryResult>(prompt);
  },

  async explainScore(context) {
    const prompt = `You are explaining how a Fan Demand Score (0-100) was influenced by measured signals for a public figure. This score is an intelligence metric, NOT an objective popularity measurement — your reasoning must reflect that framing. Respond ONLY with JSON:

{
  "factors": [{"factor": "<short label>", "weight": 0.0-1.0, "explanation": "<one sentence>"}],
  "reasoning": "<2-3 sentence overall explanation>"
}

Measured signals for ${context.name}:
- Discussion volume: ${context.discussionVolume}
- Fan card requests: ${context.fanCardRequests}
- Membership requests: ${context.membershipRequests}
- Meet & greet requests: ${context.meetGreetRequests}
- Unanswered requests: ${context.unansweredRequests}
- Complaints: ${context.complaints}
- Growth rate: ${context.growthRate}%

Base factors and weights only on these numbers. Do not claim this measures actual popularity or fame.`;

    return generateJson<ScoreReasoningResult>(prompt);
  },
};
