import 'server-only';

export type DiscussionCategory =
  | 'fan_card_request' | 'fan_card_question' | 'fan_card_waiting' | 'fan_card_complaint'
  | 'membership_request' | 'fan_club_request' | 'vip_membership' | 'membership_question'
  | 'meet_greet_want' | 'meet_greet_question' | 'vip_experience_question' | 'fan_event_question'
  | 'no_response' | 'waiting_for_reply' | 'request_unanswered' | 'asking_for_response'
  | 'general_frustration' | 'general_confusion' | 'negative_experience' | 'delayed_communication';

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'frustrated';

export interface ClassificationResult {
  isRelevant: boolean;
  categories: { category: DiscussionCategory; confidence: number }[];
  sentiment: { value: Sentiment; confidence: number };
  mentionedPublicFigures: string[];
  reasoning: string;
}

export interface EntityResolutionResult {
  canonicalName: string | null;
  isNewEntity: boolean;
  matchConfidence: number;
  reasoning: string;
}

export interface SummaryResult {
  summary: string;
  isAiGenerated: true;
}

export interface ScoreReasoningResult {
  factors: { factor: string; weight: number; explanation: string }[];
  reasoning: string;
}

/**
 * Modular AI provider interface. Any LLM provider (Gemini, OpenAI, Anthropic, etc.)
 * implements this contract so the rest of the app never depends on a specific vendor.
 */
export interface AiProvider {
  readonly name: string;

  classifyDiscussion(content: string, knownAliases: string[]): Promise<ClassificationResult>;

  resolveEntity(
    mentionedName: string,
    existingCelebrities: { id: string; canonicalName: string; aliases: string[] }[]
  ): Promise<EntityResolutionResult>;

  generateCelebritySummary(context: {
    name: string;
    totalDiscussions: number;
    fanCardPct: number | null;
    membershipPct: number | null;
    meetGreetPct: number | null;
    unansweredPct: number | null;
    trend: 'up' | 'down' | 'stable';
  }): Promise<SummaryResult>;

  explainScore(context: {
    name: string;
    discussionVolume: number;
    fanCardRequests: number;
    membershipRequests: number;
    meetGreetRequests: number;
    unansweredRequests: number;
    complaints: number;
    growthRate: number;
  }): Promise<ScoreReasoningResult>;
}
