import "server-only";

/** What we could read from a social post, before any AI extraction. */
export interface PostContent {
  caption: string | null;
  /** Comment texts, the creator's own first. */
  comments: string[];
  creator: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
}

const API = process.env.BRIGHTDATA_API_URL ?? "https://api.brightdata.com/datasets";
const MAX_COMMENTS = 15;

export function isInstagramUrl(url: string): boolean {
  try {
    return /(^|\.)instagram\.com$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Strips tracking params so the same reel always has the same URL. */
export function canonicalUrl(url: string): string {
  const u = new URL(url);
  u.search = "";
  u.hash = "";
  return u.toString();
}

/**
 * Reads a public Instagram post. Uses Bright Data's pre-built Instagram scraper when
 * BRIGHTDATA_API_KEY is set (reliable, paid per record); otherwise falls back to the
 * page's Open Graph tags, which Instagram usually blocks from server IPs.
 */
export async function fetchPost(url: string): Promise<PostContent | null> {
  if (process.env.BRIGHTDATA_API_KEY) return fetchViaBrightData(url);
  const caption = await fetchOpenGraphCaption(url);
  return caption ? { caption, comments: [], creator: null, video_url: null, thumbnail_url: null } : null;
}

async function bd(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`, "content-type": "application/json" },
    signal: AbortSignal.timeout(90_000),
  });
}

let datasetIds: Promise<Map<string, string>> | null = null;

/** Looks up scraper ids by name from the account's dataset list, so none are hard-coded. */
async function datasetId(kind: "reels" | "posts"): Promise<string> {
  const override = process.env[`BRIGHTDATA_INSTAGRAM_${kind.toUpperCase()}_DATASET`];
  if (override) return override;
  datasetIds ??= (async () => {
    const res = await bd("/list");
    if (!res.ok) throw new Error(`Bright Data dataset list failed (${res.status})`);
    const list = (await res.json()) as { id: string; name: string }[];
    return new Map(list.map((d) => [d.name.toLowerCase().replace(/[^a-z]+/g, " ").trim(), d.id]));
  })();
  datasetIds.catch(() => (datasetIds = null));
  const id = (await datasetIds).get(`instagram ${kind}`);
  if (!id) throw new Error(`Bright Data has no "Instagram - ${kind}" scraper on this account`);
  return id;
}

async function fetchViaBrightData(url: string): Promise<PostContent | null> {
  const kind = /\/(reel|reels|tv)\//.test(new URL(url).pathname) ? "reels" : "posts";
  const id = await datasetId(kind);
  let res = await bd(`/v3/scrape?dataset_id=${id}&format=json`, {
    method: "POST",
    body: JSON.stringify({ input: [{ url }] }),
  });
  if (res.status === 202) {
    // Took longer than the 1-minute sync window: poll the snapshot.
    const { snapshot_id } = (await res.json()) as { snapshot_id: string };
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      res = await bd(`/v3/snapshot/${snapshot_id}?format=json`);
      if (res.status !== 202) break;
    }
  }
  if (!res.ok) throw new Error(`Bright Data scrape failed (${res.status})`);
  const body = (await res.json()) as unknown;
  const record = (Array.isArray(body) ? body[0] : body) as Record<string, unknown> | undefined;
  if (!record) return null;
  if (record.error) throw new Error(`Bright Data: ${String(record.error)}`);
  return toPostContent(record);
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Maps a scraper record to PostContent. Field names differ between the posts and reels scrapers. */
export function toPostContent(r: Record<string, unknown>): PostContent {
  const creator = str(r.user_posted) ?? str(r.username) ?? str(r.owner_username);
  const raw = (r.latest_comments ?? r.top_comments ?? r.comments) as unknown;
  const comments = (Array.isArray(raw) ? raw : [])
    .map((c) => {
      const o = (typeof c === "object" && c ? c : {}) as Record<string, unknown>;
      const text = typeof c === "string" ? c : (str(o.comments) ?? str(o.comment) ?? str(o.text));
      const by = str(o.user_commenting) ?? str(o.username) ?? str(o.user);
      return text ? { text, mine: Boolean(creator && by === creator) } : null;
    })
    .filter((c): c is { text: string; mine: boolean } => c !== null)
    .sort((a, b) => Number(b.mine) - Number(a.mine))
    .slice(0, MAX_COMMENTS)
    .map((c) => (c.mine ? `[creator] ${c.text}` : c.text));
  const videos = r.videos as unknown;
  return {
    caption: str(r.description) ?? str(r.caption),
    comments,
    creator,
    video_url: str(r.video_url) ?? (Array.isArray(videos) ? str(videos[0]) : null),
    thumbnail_url: str(r.thumbnail) ?? str(r.display_url),
  };
}

async function fetchOpenGraphCaption(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; facebookexternalhit/1.1)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const meta = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`, "i"))?.[1] ?? null;
    const desc = meta("og:description") ?? meta("og:title");
    return desc ? decodeEntities(desc) : null;
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
