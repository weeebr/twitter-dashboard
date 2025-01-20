import { NextResponse } from "next/server";

const CACHE_DURATION = 60000; // 1 minute
let cache = { data: null, timestamp: 0 };

export async function GET() {
  try {
    const now = Date.now();
    if (cache.data && now - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data);
    }

    if (!process.env.TWITTER_BEARER_TOKEN) {
      throw new Error("Twitter token missing");
    }

    const res = await fetch(
      "https://api.twitter.com/2/users/44196397/tweets?" +
        new URLSearchParams({
          max_results: "5",
          "tweet.fields": "created_at,public_metrics,referenced_tweets",
          expansions: "referenced_tweets.id",
          "user.fields": "name,username",
        }),
      {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
      }
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
