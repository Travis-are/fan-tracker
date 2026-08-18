import 'server-only';

interface RedditToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: RedditToken | null = null;

async function getRedditToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now()) {
    return cachedToken.access_token;
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT || 'celebrity-fan-demand-intel/1.0';

  if (!clientId || !clientSecret) {
    throw new Error('Reddit API credentials not configured');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Reddit auth failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    // refresh a minute early to be safe
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.access_token;
}

export interface RawRedditPost {
  externalId: string;
  sourceUrl: string;
  authorHandle: string;
  content: string;
  engagementCount: number;
  postedAt: string;
  subreddit: string;
}

/**
 * Searches PUBLIC Reddit posts via the official read-only API (client_credentials
 * grant — no user login, no access to private subreddits/messages).
 * This respects Reddit's rate limits by using a single cached token and the
 * standard search endpoint; no scraping, no captcha bypass.
 */
export async function searchRedditPublicPosts(
  query: string,
  options: { limit?: number; subreddit?: string } = {}
): Promise<RawRedditPost[]> {
  const token = await getRedditToken();
  const userAgent = process.env.REDDIT_USER_AGENT || 'celebrity-fan-demand-intel/1.0';
  const limit = options.limit ?? 25;

  const baseUrl = options.subreddit
    ? `https://oauth.reddit.com/r/${options.subreddit}/search`
    : `https://oauth.reddit.com/search`;

  const params = new URLSearchParams({
    q: query,
    sort: 'new',
    limit: String(limit),
    restrict_sr: options.subreddit ? 'true' : 'false',
    type: 'link',
  });

  const res = await fetch(`${baseUrl}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': userAgent,
    },
  });

  if (!res.ok) {
    throw new Error(`Reddit search failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const children = data?.data?.children ?? [];

  return children
    .map((child: any) => child.data)
    .filter((post: any) => post && !post.over_18) // exclude NSFW-flagged content
    .map((post: any): RawRedditPost => ({
      externalId: post.id,
      sourceUrl: `https://reddit.com${post.permalink}`,
      authorHandle: post.author ?? '[deleted]',
      content: `${post.title ?? ''}\n${post.selftext ?? ''}`.trim().slice(0, 4000),
      engagementCount: (post.score ?? 0) + (post.num_comments ?? 0),
      postedAt: new Date((post.created_utc ?? 0) * 1000).toISOString(),
      subreddit: post.subreddit ?? '',
    }));
}
