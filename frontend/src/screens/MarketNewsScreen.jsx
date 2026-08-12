import { useEffect, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import { LoadingSpinner } from "../components/ui";
import { intelligenceApi, claimsApi } from "../services/api";
import useWatchlist from "../hooks/useWatchlist";
import FeedItemCard from "../components/feed/FeedItemCard";
import { logError } from "../utils/errorHandling";
import { useI18n } from "../i18n/I18nProvider";

// Sprint 27 Priority 3 — the backend can return up to 28 events (the full
// pool other consumers like Global Intelligence and Alpha Discovery need),
// already ranked by real importance/personalization server-side. Daily
// Feed's own job is "surface only the most important intelligence," so it
// shows only the top-ranked slice rather than the full unranked dump.
const MAX_DAILY_FEED_ITEMS = 12;
const MIN_IMPORTANCE_SCORE = 80;

function asImportanceScore(item) {
  const score = Number(item?.importanceScore);
  return Number.isFinite(score) ? score : 0;
}

function getMonthCalendar(items) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventsByDay = new Map();

  items.forEach((item) => {
    const date = new Date(item.publishedAt);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month) return;
    const day = date.getDate();
    eventsByDay.set(day, [...(eventsByDay.get(day) || []), item]);
  });

  return { year, month, firstWeekday, daysInMonth, eventsByDay };
}

function PriorityCalendar({ items }) {
  const { year, month, firstWeekday, daysInMonth, eventsByDay } = useMemo(() => getMonthCalendar(items), [items]);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  const days = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index - firstWeekday + 1);

  return (
    <section className="feed-calendar" aria-label={`${monthLabel} priority event calendar`}>
      <div className="feed-calendar__heading">
        <div><p className="eyebrow">Priority calendar</p><h2>{monthLabel}</h2></div>
        <p>Only verified feed events rated 8/10+ are marked.</p>
      </div>
      <div className="feed-calendar__weekdays" aria-hidden="true">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="feed-calendar__grid">
        {days.map((day, index) => {
          if (day < 1) return <span className="feed-calendar__day feed-calendar__day--empty" key={`empty-${index}`} />;
          const events = eventsByDay.get(day) || [];
          const strongest = events.reduce((best, item) => Math.max(best, asImportanceScore(item)), 0);
          return <span className={`feed-calendar__day${events.length ? " is-priority" : ""}`} key={day} title={events.map((item) => item.headline).join("\n")} aria-label={events.length ? `${day}: ${events.length} priority events, highest importance ${Math.round(strongest)}/100` : `${day}: no priority events`}>{day}{events.length ? <i>{events.length}</i> : null}</span>;
        })}
      </div>
      {!eventsByDay.size ? <p className="feed-calendar__empty">No dated priority events have been recorded this month.</p> : null}
    </section>
  );
}

/**
 * Sprint 20, Part 4/5 — the Daily Feed. Replaces the previous fully-mock
 * "Market News" screen with the real, live event feed
 * (autonomousMarketService's processed events), personalized server-side
 * by the investor profile when one exists (feedPersonalizationService).
 */
export default function MarketNewsScreen() {
  const { t } = useI18n();
  const { watchlist } = useWatchlist();
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // Phase UI-INTEGRATION-001 — "Changed Claims" per news item. Fetched once
  // for the whole feed (not per-card) and handed down to FeedItemCard,
  // which derives an honest, disclosed relationship (real symbol overlap +
  // real recent-transition timing) — never a fabricated causal link. A
  // failed fetch here degrades to every item honestly showing "No active
  // Claims affected." rather than blocking the feed.
  const [activeClaims, setActiveClaims] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const data = await intelligenceApi.liveFeed({ watchlist });
        if (!cancelled) {
          setFeed(data.feed || []);
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
    async function loadClaims() {
      // Active claims cover "created/strengthened/weakened"; recently
      // invalidated claims (a terminal status, so absent from "active")
      // are fetched separately so a real invalidation can also be surfaced.
      const [activeResult, invalidatedResult] = await Promise.allSettled([
        claimsApi.listActive({ limit: 200 }),
        claimsApi.listRecentlyInvalidated({ limit: 100 }),
      ]);
      if (cancelled) return;
      const active = activeResult.status === "fulfilled" ? activeResult.value.claims || [] : [];
      const invalidated = invalidatedResult.status === "fulfilled" ? invalidatedResult.value.claims || [] : [];
      if (activeResult.status === "rejected") logError("daily feed active claims load failed", activeResult.reason);
      if (invalidatedResult.status === "rejected") logError("daily feed invalidated claims load failed", invalidatedResult.reason);
      setActiveClaims([...active, ...invalidated]);
    }
    load();
    loadClaims();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.join(",")]);

  const priorityFeed = useMemo(() => feed
    .filter((item) => asImportanceScore(item) >= MIN_IMPORTANCE_SCORE)
    .sort((left, right) => asImportanceScore(right) - asImportanceScore(left) || new Date(right.publishedAt || 0) - new Date(left.publishedAt || 0))
    .slice(0, MAX_DAILY_FEED_ITEMS), [feed]);

  return (
    <div className="screen-page">
      <section className="screen-hero feed-hero">
        <div>
          <p className="eyebrow">{t("core.dailyFeed")}</p>
          <h1>{t("core.dailyFeedTitle")}</h1>
          <p className="subtext">Only the events that can materially move your decision-making: score 8/10 and above, ranked by importance.</p>
        </div>
        <div className="feed-hero__threshold" aria-label="Minimum importance threshold 8 out of 10"><strong>8.0+</strong><span>importance threshold</span></div>
      </section>

      {!isLoading ? <PriorityCalendar items={priorityFeed} /> : null}

      <SectionCard title={t("core.todaysFeed")} subtitle={priorityFeed.length ? `${priorityFeed.length} priority items · ranked` : "8/10+ only"} className="screen-card feed-results-card">
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
            {priorityFeed.length ? (
              <div className="news-list">
                {priorityFeed.map((item, index) => (
                  <FeedItemCard key={item.id || item.headline} item={item} activeClaims={activeClaims} rank={index + 1} />
                ))}
              </div>
            ) : !error ? (
              <p className="company-description subtle">
                No relevant feed items right now. This screen does not create placeholder events — new items appear after a source records a real event.
              </p>
            ) : null}
          </>
        )}
      </SectionCard>
    </div>
  );
}
