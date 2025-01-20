"use client";

import { useEffect, useState } from "react";

import { cache } from "@/lib/cache";

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  referenced_tweets?: {
    type: "replied_to" | "retweeted" | "quoted";
    id: string;
    text?: string;
    author?: {
      username: string;
      name: string;
    };
  }[];
  in_reply_to_user_id?: string;
}

interface TwitterResponse {
  tweets: Tweet[];
  includes?: {
    users?: {
      id: string;
      name: string;
      username: string;
      profile_image_url?: string;
    }[];
    media?: {
      media_key: string;
      type: string;
      url?: string;
      preview_image_url?: string;
    }[];
  };
  error?: string;
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 bg-white shadow rounded-lg animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
}

function TweetCard({ tweet }: { tweet: Tweet }) {
  const isReply = tweet.referenced_tweets?.some((t) => t.type === "replied_to");
  const isRetweet = tweet.referenced_tweets?.some(
    (t) => t.type === "retweeted"
  );
  const isQuote = tweet.referenced_tweets?.some((t) => t.type === "quoted");
  const referencedTweet = tweet.referenced_tweets?.[0];

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
      {(isReply || isRetweet || isQuote) && (
        <div className="px-6 pt-3 pb-1 text-sm text-gray-500">
          {isReply && (
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Replying to {referencedTweet?.author?.username || "tweet"}
            </div>
          )}
          {isRetweet && (
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              Retweeted {referencedTweet?.author?.name}
            </div>
          )}
          {isQuote && (
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              Quoted {referencedTweet?.author?.name}
            </div>
          )}
        </div>
      )}

      {referencedTweet?.text && (
        <div className="mx-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100">
          {referencedTweet.text}
        </div>
      )}

      <div className="p-6">
        <p className="text-gray-900 whitespace-pre-wrap break-words">
          {tweet.text}
        </p>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <time dateTime={tweet.created_at}>
            {new Date(tweet.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>

          <div className="flex items-center gap-6">
            <button
              className="flex items-center gap-2 hover:text-blue-500 transition-colors duration-200"
              title="Reply"
              aria-label="Reply to tweet"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              <span>{tweet.public_metrics?.reply_count || 0}</span>
            </button>

            <button
              className="flex items-center gap-2 hover:text-green-500 transition-colors duration-200"
              title="Retweet"
              aria-label="Retweet this tweet"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
              <span>{tweet.public_metrics?.retweet_count || 0}</span>
            </button>

            <button
              className="flex items-center gap-2 hover:text-red-500 transition-colors duration-200"
              title="Like"
              aria-label="Like this tweet"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{tweet.public_metrics?.like_count || 0}</span>
            </button>

            <a
              href={`https://twitter.com/elonmusk/status/${tweet.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-blue-500 transition-colors duration-200"
              title="Open in Twitter"
              aria-label="View original tweet on Twitter"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TweetFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log(`<fff> tweets`, tweets);

  useEffect(() => {
    async function fetchTweets() {
      try {
        // Check cache first
        const cached = cache.get<TwitterResponse>();
        console.log(`<fff> cached`, cached);
        if (cached?.data?.tweets?.length) {
          setTweets(cached.data.tweets);
          setLoading(false);
          return;
        }

        // Fetch from API if no cache
        const res = await fetch("/api/tweets");
        const data: TwitterResponse = await res.json();

        if (data.tweets?.length) {
          // Update cache and state
          cache.set<TwitterResponse>(data);
          setTweets(data.tweets);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tweets");
        console.error("Tweet fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTweets();
  }, []);

  if (loading) return <LoadingState />;
  if (error)
    return (
      <div className="p-4 bg-white shadow rounded-xl text-red-600">{error}</div>
    );

  return (
    <div className="space-y-4">
      {tweets.map((tweet) => (
        <TweetCard key={tweet.id} tweet={tweet} />
      ))}
    </div>
  );
}
