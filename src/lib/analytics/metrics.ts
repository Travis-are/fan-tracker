import 'server-only';

// Minimum sample size before we'll display a percentage instead of "INSUFFICIENT DATA".
// Documented per the spec requirement: never fabricate/display unreliable percentages.
const MIN_SAMPLE_SIZE = 5;

export type MetricValue = number | 'INSUFFICIENT_DATA';

export interface CategoryCounts {
  fanCardCount: number;
  membershipCount: number;
  meetGreetCount: number;
  unansweredCount: number;
  complaintCount: number;
  totalRelevantDiscussions: number;
  totalDiscussions: number;
}

export interface DemandPercentages {
  fanCardPct: MetricValue;
  membershipPct: MetricValue;
  meetGreetPct: MetricValue;
  unansweredPct: MetricValue;
  complaintPct: MetricValue;
}

function safePct(numerator: number, denominator: number): MetricValue {
  if (denominator < MIN_SAMPLE_SIZE) return 'INSUFFICIENT_DATA';
  return Math.round((numerator / denominator) * 10000) / 100; // 2 decimal places
}

/**
 * Formulas (documented per spec section 9):
 *
 * Fan Card Demand %    = fan_card_discussions / total_relevant_fan_demand_discussions * 100
 * Membership Demand %  = membership_discussions / total_relevant_fan_demand_discussions * 100
 * Meet & Greet Demand %= meet_greet_discussions / total_relevant_fan_demand_discussions * 100
 * Unanswered Request % = unanswered_discussions / total_relevant_discussions * 100
 * Complaint %          = complaint_discussions / total_relevant_discussions * 100
 *
 * "total_relevant_fan_demand_discussions" = fanCard + membership + meetGreet counts combined
 * (the demand-type subset). "total_relevant_discussions" = all discussions classified as
 * relevant to this celebrity (broader denominator, per spec section 9).
 *
 * Any percentage is replaced with 'INSUFFICIENT_DATA' when its denominator is below
 * MIN_SAMPLE_SIZE, so the UI must render "INSUFFICIENT DATA" rather than a misleading number.
 */
export function calculateDemandPercentages(counts: CategoryCounts): DemandPercentages {
  const demandDenominator =
    counts.fanCardCount + counts.membershipCount + counts.meetGreetCount;

  return {
    fanCardPct: safePct(counts.fanCardCount, demandDenominator),
    membershipPct: safePct(counts.membershipCount, demandDenominator),
    meetGreetPct: safePct(counts.meetGreetCount, demandDenominator),
    unansweredPct: safePct(counts.unansweredCount, counts.totalRelevantDiscussions),
    complaintPct: safePct(counts.complaintCount, counts.totalRelevantDiscussions),
  };
}

const FAN_CARD_CATEGORIES = [
  'fan_card_request', 'fan_card_question', 'fan_card_waiting', 'fan_card_complaint',
];
const MEMBERSHIP_CATEGORIES = [
  'membership_request', 'fan_club_request', 'vip_membership', 'membership_question',
];
const MEET_GREET_CATEGORIES = [
  'meet_greet_want', 'meet_greet_question', 'vip_experience_question', 'fan_event_question',
];
const UNANSWERED_CATEGORIES = [
  'no_response', 'waiting_for_reply', 'request_unanswered', 'asking_for_response',
];
const COMPLAINT_CATEGORIES = [
  'fan_card_complaint', 'general_frustration', 'general_confusion',
  'negative_experience', 'delayed_communication', 'request_unanswered',
];

export function countCategoriesFromRows(
  categoryRows: { category: string; discussion_id: string }[],
  totalDiscussions: number
): CategoryCounts {
  const uniqueRelevant = new Set(categoryRows.map((r) => r.discussion_id));

  const count = (list: string[]) =>
    categoryRows.filter((r) => list.includes(r.category)).length;

  return {
    fanCardCount: count(FAN_CARD_CATEGORIES),
    membershipCount: count(MEMBERSHIP_CATEGORIES),
    meetGreetCount: count(MEET_GREET_CATEGORIES),
    unansweredCount: count(UNANSWERED_CATEGORIES),
    complaintCount: count(COMPLAINT_CATEGORIES),
    totalRelevantDiscussions: uniqueRelevant.size,
    totalDiscussions,
  };
}
