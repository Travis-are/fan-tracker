import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { searchRedditPublicPosts } from '@/lib/ingestion/reddit';
import { generateDemoDiscussions, getDemoFigures } from '@/lib/ingestion/demo-data';
import { aiProvider } from '@/lib/ai';

function isLiveModeAvailable() {
  return (
    process.env.DEMO_MODE !== 'true' &&
    !!process.env.REDDIT_CLIENT_ID &&
    !!process.env.REDDIT_CLIENT_SECRET &&
    !!process.env.GEMINI_API_KEY
  );
}

async function getOrCreateCelebrity(
  db: ReturnType<typeof createAdminClient>,
  mentionedName: string,
  isDemo: boolean
) {
  const { data: existing } = await db
    .from('celebrities')
    .select('id, canonical_name')
    .limit(50);

  const candidates = (existing ?? []).map((c) => ({
    id: c.id,
    canonicalName: c.canonical_name,
    aliases: [] as string[],
  }));

  let resolvedId: string | null = null;

  if (candidates.length > 0) {
    const resolution = await aiProvider.resolveEntity(mentionedName, candidates);
    if (!resolution.isNewEntity && resolution.matchConfidence > 0.7) {
      const match = candidates.find((c) => c.canonicalName === resolution.canonicalName);
      resolvedId = match?.id ?? null;
    }
  }

  if (resolvedId) return resolvedId;

  const { data: created, error } = await db
    .from('celebrities')
    .insert({
      canonical_name: mentionedName,
      category: 'public_figure',
      is_demo: isDemo,
    } as any)
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}

async function runLiveIngestion(db: ReturnType<typeof createAdminClient>, jobId: string) {
  const { data: platform } = await db
    .from('social_platforms')
    .select('id')
    .eq('name', 'reddit')
    .single();

  const searchTerms = ['fan card', 'meet and greet', 'fan club membership', 'VIP membership celebrity'];
  let processed = 0;
  let created = 0;

  for (const term of searchTerms) {
    const posts = await searchRedditPublicPosts(term, { limit: 20 });

    for (const post of posts) {
      processed++;

      const { data: existingDiscussion } = await db
        .from('public_discussions')
        .select('id')
        .eq('platform_id', platform?.id)
        .eq('external_id', post.externalId)
        .maybeSingle();

      if (existingDiscussion) continue;

      const classification = await aiProvider.classifyDiscussion(post.content, []);
      if (!classification.isRelevant || classification.mentionedPublicFigures.length === 0) {
        continue;
      }

      const celebrityId = await getOrCreateCelebrity(
        db,
        classification.mentionedPublicFigures[0],
        false
      );

      const { data: discussion, error: discussionError } = await db
        .from('public_discussions')
        .insert({
          celebrity_id: celebrityId,
          platform_id: platform?.id,
          source_url: post.sourceUrl,
          external_id: post.externalId,
          author_handle: post.authorHandle,
          content_excerpt: post.content,
          engagement_count: post.engagementCount,
          posted_at: post.postedAt,
          is_demo: false,
          ingestion_job_id: jobId,
        })
        .select('id')
        .single();

      if (discussionError || !discussion) continue;
      created++;

      await db.from('discussion_categories').insert(
        classification.categories.map((c) => ({
          discussion_id: discussion.id,
          category: c.category,
          confidence: c.confidence,
        }))
      );

      await db.from('sentiment_analysis').insert({
        discussion_id: discussion.id,
        sentiment: classification.sentiment.value,
        confidence: classification.sentiment.confidence,
      });

      await db.from('ai_analysis').insert({
        discussion_id: discussion.id,
        celebrity_id: celebrityId,
        analysis_type: 'classification',
        model_name: aiProvider.name,
        ai_output: classification as unknown as Record<string, unknown>,
        is_inference: true,
      });
    }
  }

  return { processed, created };
}

async function runDemoIngestion(db: ReturnType<typeof createAdminClient>, jobId: string) {
  const discussions = generateDemoDiscussions(60);
  let created = 0;

  for (const item of discussions) {
    const { data: celeb } = await db
      .from('celebrities')
      .select('id')
      .eq('canonical_name', item.celebrityName)
      .maybeSingle();

    const celebrityId =
      celeb?.id ??
      (
        await db
          .from('celebrities')
          .insert({
            canonical_name: item.celebrityName,
            category: 'public_figure',
            is_demo: true,
          })
          .select('id')
          .single()
      ).data?.id;

    if (!celebrityId) continue;

    const { data: discussion } = await db
      .from('public_discussions')
      .insert({
        celebrity_id: celebrityId,
        content_excerpt: item.content,
        author_handle: item.authorHandle,
        engagement_count: item.engagementCount,
        posted_at: item.postedAt,
        is_demo: true,
        ingestion_job_id: jobId,
      })
      .select('id')
      .single();

    if (!discussion) continue;
    created++;

    await db.from('discussion_categories').insert({
      discussion_id: discussion.id,
      category: item.category,
      confidence: 1,
    });

    await db.from('sentiment_analysis').insert({
      discussion_id: discussion.id,
      sentiment: item.sentiment,
      confidence: 1,
    });
  }

  return { processed: discussions.length, created };
}

/** Main entry point — runs live ingestion if configured, else auto-falls-back to demo mode. */
export async function runIngestionPipeline() {
  const db = createAdminClient();
  const liveMode = isLiveModeAvailable();

  const { data: source } = await db
    .from('data_sources')
    .upsert(
      {
        source_type: liveMode ? 'api' : 'demo',
        status: 'active',
        config: { mode: liveMode ? 'live' : 'demo' },
      },
      { onConflict: 'id' }
    )
    .select('id')
    .single();

  const { data: job, error: jobError } = await db
    .from('ingestion_jobs')
    .insert({
      data_source_id: source?.id,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (jobError || !job) {
    throw new Error('Failed to create ingestion job');
  }

  try {
    const result = liveMode
      ? await runLiveIngestion(db, job.id)
      : await runDemoIngestion(db, job.id);

    await db
      .from('ingestion_jobs')
      .update({
        status: 'completed',
        items_processed: result.processed,
        items_created: result.created,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return { mode: liveMode ? 'live' : 'demo', ...result };
  } catch (err) {
    await db
      .from('ingestion_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    await db.from('system_logs').insert({
      level: 'error',
      source: 'ingestion_orchestrator',
      message: err instanceof Error ? err.message : 'Unknown ingestion error',
    });

    throw err;
  }
}
