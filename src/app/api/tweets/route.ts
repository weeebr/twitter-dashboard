import { NextResponse } from "next/server";

const CACHE_DURATION = 60000; // 1 minute
interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  referenced_tweets?: {
    type: string;
    id: string;
  }[];
  attachments?: {
    media_keys: string[];
  };
}

interface User {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface Media {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

interface Includes {
  users?: User[];
  media?: Media[];
}

interface CacheData {
  tweets: Tweet[];
  includes?: Includes;
  error?: string;
}

let cache: { data: CacheData | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
let currentTokenIndex = 0;

interface RateLimitInfo {
  remaining: number;
  reset: number;
}

const rateLimits = new Map<string, RateLimitInfo>();

function getBearerTokens(): string[] {
  const tokens = [
    process.env.TWITTER_BEARER_TOKEN_1,
    process.env.TWITTER_BEARER_TOKEN_2,
    process.env.TWITTER_BEARER_TOKEN_3,
  ].filter((token): token is string => !!token);

  if (tokens.length === 0) {
    throw new Error("No valid Twitter tokens found in environment variables");
  }

  return tokens;
}

function updateRateLimits(token: string, headers: Headers) {
  const remaining = parseInt(headers.get("x-rate-limit-remaining") || "0");
  const reset = parseInt(headers.get("x-rate-limit-reset") || "0") * 1000;

  if (!isNaN(remaining) && !isNaN(reset)) {
    rateLimits.set(token, { remaining, reset });
  }
}

function getNextAvailableToken() {
  const tokens = getBearerTokens();
  const now = Date.now();

  // Find token with remaining requests or earliest reset time
  let bestToken = tokens[currentTokenIndex];
  let earliestReset = Infinity;

  for (const token of tokens) {
    const limit = rateLimits.get(token);
    if (!limit || limit.remaining > 0) {
      return token;
    }
    if (limit.reset < earliestReset) {
      earliestReset = limit.reset;
      bestToken = token;
    }
  }

  // If all tokens are rate limited, calculate wait time
  if (earliestReset !== Infinity) {
    const waitTime = earliestReset - now;
    if (waitTime > 0) {
      throw new Error(
        `Rate limited on all tokens. Next reset in ${Math.ceil(
          waitTime / 1000
        )} seconds`
      );
    }
  }

  return bestToken;
}

async function fetchWithTokenRotation(url: string, options: RequestInit) {
  const tokens = getBearerTokens();
  if (tokens.length === 0) {
    throw new Error("No Twitter tokens available");
  }

  const token = getNextAvailableToken();
  currentTokenIndex = tokens.indexOf(token);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    // Update rate limit tracking
    updateRateLimits(token, res.headers);

    if (res.status === 429) {
      // Rate limit exceeded - mark token as exhausted
      rateLimits.set(token, {
        remaining: 0,
        reset: Date.now() + 15 * 60 * 1000,
      });
      throw new Error("Rate limit exceeded");
    }

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    return res;
  } catch (error) {
    console.error(`Token rotation error (token ${currentTokenIndex}):`, error);
    // Try next token
    currentTokenIndex = (currentTokenIndex + 1) % tokens.length;
    return fetchWithTokenRotation(url, options);
  }
}

export async function GET() {
  try {
    const now = Date.now();
    if (cache.data && now - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    const res = await fetchWithTokenRotation(
      "https://api.twitter.com/2/users/44196397/tweets?" +
        new URLSearchParams({
          max_results: "5",
          "tweet.fields":
            "created_at,public_metrics,referenced_tweets,attachments",
          expansions: "referenced_tweets.id.author_id,attachments.media_keys",
          "user.fields": "name,username,profile_image_url",
          "media.fields": "url,preview_image_url,type",
        }),
      {}
    );

    const response = await res.json();
    console.log("Twitter API response:", { status: res.status, response });

    if (!res.ok) {
      throw new Error(response.detail || "Twitter API error");
    }

    // Flatten the response structure
    const flattened: CacheData = {
      tweets: response.data as Tweet[],
      includes: response.includes as Includes,
      error: response.error,
    };

    cache = { data: flattened, timestamp: now };
    return NextResponse.json(flattened);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
