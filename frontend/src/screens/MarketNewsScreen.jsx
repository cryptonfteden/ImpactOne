import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { LoadingSpinner } from "../components/ui";
import { intelligenceApi } from "../services/api";
import useWatchlist from "../hooks/useWatchlist";
import FeedItemCard from "../components/feed/FeedItemCard";
import { logError } from "../utils/errorHandling";

// Sprint 27 Priority 3 — the backend can return up to 28 events (the full
// pool other consumers like Global Intelligence and Alpha Discovery need),
// already ranked by real importance/personalization server-side. Daily
// Feed's own job is "surface only the most important intelligence," so it
// shows only the top-ranked slice rather than the full unranked dump.
const MAX_DAILY_FEED_ITEMS = 12;

/**
 * Sprint 20, Part 4/5 — the Daily Feed. Replaces the previous fully-mock
 * "Market News" screen with the real, live event feed
 * (autonomousMarketService's processed events), personalized server-side
 * by the investor profile when one exists (feedPersonalizationService).
 */
export default function MarketNewsScreen() {
  const { watchlist } = useWatchlist();
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await intelligenceApi.liveFeed({ watchlist });
        if (!cancelled) {
          setFeed((data.feed || []).slice(0, MAX_DAILY_FEED_ITEMS));
          setError("");
        }
      } catch (loadError) {
        logError("daily feed load failed", loadError);
        // Sprint 34 — a refresh failure must not hide feed items already
        // on screen; render logic below now shows the error alongside
        // existing data instead of instead of it.
        if (!cancelled) {
          setError("We couldn't refresh the feed right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.join(",")]);

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Daily Feed</p>
          <h1>What's moving markets, ranked for you</h1>
          <p className="subtext">
            Real events, scored for importance and confidence, personalized to your portfolio, watchlist, and profile.
          </p>
        </div>
      </section>

      <SectionCard title="Today's feed" subtitle={feed.length ? `${feed.length} items` : undefined} className="screen-card">
        {isLoading ? (
          <LoadingSpinner label="Loading today's feed" />
        ) : (
          <>
            {error ? (
              // Sprint 34 — a refresh failure with items already loaded
              // must not hide them; this only replaces the whole card
              // when there's genuinely nothing to fall back to (below).
              <p className="company-description subtle negative">
                {error}{feed.length ? " Showing the last items that loaded successfully." : ""}
              </p>
            ) : null}
            {feed.length ? (
              <div className="news-list">
                {feed.map((item) => (
                  <FeedItemCard key={item.id || item.headline} item={item} />
                ))}
              </div>
            ) : !error ? (
              <p className="company-description subtle">No feed items right now — check back soon.</p>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}
