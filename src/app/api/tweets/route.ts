import { NextResponse } from "next/server";

const CACHE_DURATION = 60000; // 1 minute
let cache = { data: null, timestamp: 0 };
let currentTokenIndex = 0;

function getBearerTokens() {
  return [process.env.TWITTER_BEARER_TOKEN_1].filter(Boolean);
}

async function fetchWithTokenRotation(url: string, options: RequestInit) {
  const tokens = getBearerTokens();
  if (tokens.length === 0) {
    throw new Error("No Twitter tokens available");
  }

  for (let i = 0; i < tokens.length; i++) {
    console.log(currentTokenIndex);
    const token = tokens[currentTokenIndex];
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 429) {
        // Rate limit exceeded
        currentTokenIndex = (currentTokenIndex + 1) % tokens.length;
        continue;
      }

      return res;
    } catch (error) {
      console.error(
        `Token rotation error (token ${currentTokenIndex}):`,
        error
      );
      currentTokenIndex = (currentTokenIndex + 1) % tokens.length;
      continue;
    }
  }

  throw new Error("All tokens rate limited");
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
          "tweet.fields": "created_at,public_metrics,referenced_tweets",
          expansions: "referenced_tweets.id",
          "user.fields": "name,username",
        }),
      {}
    );

    const data = await res.json();
    console.log("Twitter API response:", { status: res.status, data });

    if (!res.ok) {
      throw new Error(data.detail || "Twitter API error");
    }

    cache = { data, timestamp: now };
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
