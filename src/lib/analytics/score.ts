import 'server-only';

export type ScoreLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

export interface ScoreInputs {
  discussionVolume: number;
  fanCardRequests: number;
  membershipRequests: number;
  meetGreetRequests: number;
  unansweredRequests: number;
  complaints: number;
  growthRatePct: number; // e.g. 25 = +25%
}

export interface ScoreBreakdown {
  score: number;
  level: ScoreLevel;
  factors: { factor: string; points: number; maxPoints: number }[];
}

function scoreLevel(score: number): ScoreLevel {
  if (score <= 20) return 'very_low';
  if (score <= 40) return 'low';
  if (score <= 60) return 'moderate';
  if (score <= 80) return 'high';
  return 'very_high';
}

// Diminishing-returns curve so raw volume doesn't dominate linearly — a celebrity
// with 500 discussions isn't "25x" the demand of one with 20, it's meaningfully more
// but the scale is logarithmic to stay bounded and interpretable.
function scaledPoints(value: number, maxValue: number, maxPoints: number): number {
  if (value <= 0) return 0;
  const ratio = Math.log(value + 1) / Math.log(maxValue + 1);
  return Math.min(maxPoints, Math.round(ratio * maxPoints * 100) / 100);
}

/**
 * Fan Demand Score (0-100): an intelligence metric derived from measurable
 * public-discussion signals. This is NOT a claim of objective popularity —
 * it reflects volume and composition of publicly observed demand signals only.
 * Weights and reference scales are documented inline; adjust MAX_REFERENCE
 * values as real data volume grows.
 */
export function calculateFanDemandScore(inputs: ScoreInputs): ScoreBreakdown {
  const MAX_REFERENCE = {
    discussionVolume: 1000,
    fanCardRequests: 300,
    membershipRequests: 300,
    meetGreetRequests: 300,
    unansweredRequests: 200,
    growthRatePct: 200,
  };

  const factors = [
    {
      factor: 'Discussion volume',
      points: scaledPoints(inputs.discussionVolume, MAX_REFERENCE.discussionVolume, 25),
      maxPoints: 25,
    },
    {
      factor: 'Fan card requests',
      points: scaledPoints(inputs.fanCardRequests, MAX_REFERENCE.fanCardRequests, 15),
      maxPoints: 15,
    },
    {
      factor: 'Membership requests',
      points: scaledPoints(inputs.membershipRequests, MAX_REFERENCE.membershipRequests, 15),
      maxPoints: 15,
    },
    {
      factor: 'Meet & greet requests',
      points: scaledPoints(inputs.meetGreetRequests, MAX_REFERENCE.meetGreetRequests, 15),
      maxPoints: 15,
    },
    {
      factor: 'Unanswered requests',
      points: scaledPoints(inputs.unansweredRequests, MAX_REFERENCE.unansweredRequests, 10),
      maxPoints: 10,
    },
    {
      factor: 'Growth rate',
      points:
        inputs.growthRatePct > 0
          ? scaledPoints(inputs.growthRatePct, MAX_REFERENCE.growthRatePct, 15)
          : 0,
      maxPoints: 15,
    },
    {
      factor: 'Complaint volume (demand indicator, capped)',
      points: Math.min(5, scaledPoints(inputs.complaints, 200, 5)),
      maxPoints: 5,
    },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.points, 0) * 100) / 100;

  return {
    score: Math.min(100, score),
    level: scoreLevel(Math.min(100, score)),
    factors,
  };
}
