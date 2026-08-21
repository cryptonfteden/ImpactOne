export default function HomeFeature() {
  const missionControlUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5175/?embed=app`
    : "http://127.0.0.1:5175/?embed=app";

  // One canonical home renderer at every viewport. Previously compact screens
  // switched to HomeScreen, so the same user saw different rankings, copy and
  // section order on the app and Mission Control. The embedded site is now the
  // single source of truth; its CSS owns the responsive presentation.
  return (
    <section className="unified-mission-home" aria-label="ImpactOne Mission Control">
      <iframe
        className="unified-mission-home__frame"
        src={missionControlUrl}
        title="ImpactOne Mission Control"
        allow="fullscreen"
      />
    </section>
  );
}
