import TweetFeed from "./components/TweetFeed";

export default function Home() {
  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Twitter Dashboard</h1>
        <p className="text-gray-600 mt-2">Latest tweets from Elon Musk</p>
      </div>
      <TweetFeed />
    </main>
  );
}
