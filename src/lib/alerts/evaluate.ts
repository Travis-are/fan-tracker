import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Evaluates every active alert against the latest computed metrics and
 * flips status to 'triggered' when the threshold is crossed. Does not send
 * notifications itself (no email/SMS provider wired yet) — it records the
 * trigger so the Alerts page can reflect it; wiring a notification channel
 * is a clearly separate, later step.
 */
export async function evaluateAlerts() {
  const db = createAdminClient();

  const { data: alerts } = await db
    .from('alerts')
    .select('*')
    .eq('status', 'active');

  if (!alerts || alerts.length === 0) return { evaluated: 0, triggered: 0 };

  let triggered = 0;

  for (const alert of alerts) {
    if (!alert.celebrity_id) continue; // global alert types not yet supported

    const { data: latest } = await db
      .from('trend_metrics')
      .select('*')
      .eq('celebrity_id', alert.celebrity_id)
      .order('metric_date', { ascending: false })
      .limit(2);

    if (!latest || latest.length === 0) continue;
    const current = latest[0];
    const previous = latest[1] ?? null;

    let shouldTrigger = false;

    switch (alert.alert_type) {
      case 'score_threshold':
        shouldTrigger = (current.fan_demand_score ?? 0) >= alert.threshold_value;
        break;
      case 'meet_greet_threshold':
        shouldTrigger = current.meet_greet_demand >= alert.threshold_value;
        break;
      case 'fan_card_increase':
        shouldTrigger =
          !!previous &&
          previous.fan_card_demand > 0 &&
          ((current.fan_card_demand - previous.fan_card_demand) / previous.fan_card_demand) * 100 >=
            alert.threshold_value;
        break;
      case 'membership_increase':
        shouldTrigger =
          !!previous &&
          previous.membership_demand > 0 &&
          ((current.membership_demand - previous.membership_demand) / previous.membership_demand) *
            100 >=
            alert.threshold_value;
        break;
      case 'unanswered_increase':
        shouldTrigger =
          !!previous && current.unanswered_requests > previous.unanswered_requests;
        break;
    }

    if (shouldTrigger) {
      await db
        .from('alerts')
        .update({ status: 'triggered', last_triggered_at: new Date().toISOString() })
        .eq('id', alert.id);
      triggered++;
    }
  }

  return { evaluated: alerts.length, triggered };
}
