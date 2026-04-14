import { useState } from "react";
import { planRoute, type RoutePlanResponse, type GeocodePlace } from "@workspace/api-client-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { Navigation2, ChevronDown, ChevronUp, X } from "lucide-react";

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${r} min` : `${h} h`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

type Props = {
  topClassName?: string;
  onRoutePlanned: (plan: RoutePlanResponse | null) => void;
};

export function RoutePlannerCard({ topClassName = "top-[4.5rem]", onRoutePlanned }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromPlace, setFromPlace] = useState<GeocodePlace | null>(null);
  const [toPlace, setToPlace] = useState<GeocodePlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RoutePlanResponse | null>(null);

  const clearRoute = () => {
    setSummary(null);
    setError(null);
    onRoutePlanned(null);
  };

  const runPlan = async () => {
    setError(null);
    if (!fromPlace || !toPlace) {
      setError("Choose both places from the suggestions.");
      return;
    }
    setLoading(true);
    try {
      const res = await planRoute({
        fromLat: fromPlace.lat,
        fromLng: fromPlace.lng,
        toLat: toPlace.lat,
        toLng: toPlace.lng,
      });
      setSummary(res);
      onRoutePlanned(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not plan route.";
      setError(msg);
      onRoutePlanned(null);
    } finally {
      setLoading(false);
    }
  };

  const rec = summary?.recommended;

  return (
    <div
      className={`absolute left-3 right-3 z-[600] max-h-[min(320px,42vh)] rounded-2xl border border-white/30 bg-white/95 shadow-xl backdrop-blur-md overflow-hidden ${topClassName}`}
    >
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#01411C]">
          <Navigation2 className="w-4 h-4 shrink-0" />
          Route (A → B)
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {summary ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                clearRoute();
              }}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Clear route"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 max-h-[260px] overflow-y-auto">
          <LocationAutocomplete
            value={fromText}
            onChange={setFromText}
            selected={fromPlace}
            onSelect={p => {
              setFromPlace(p);
              setFromText(p.label);
            }}
            placeholder="From (point A)"
            variant="light"
          />
          <LocationAutocomplete
            value={toText}
            onChange={setToText}
            selected={toPlace}
            onSelect={p => {
              setToPlace(p);
              setToText(p.label);
            }}
            placeholder="To (point B)"
            variant="light"
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={runPlan}
            disabled={loading}
            className="w-full rounded-xl bg-[#15803d] py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "Planning…" : "Plan safe route"}
          </button>
          {rec && summary ? (
            <div className="text-xs text-gray-700 space-y-1 pt-1 border-t border-gray-100">
              <p>
                <span className="font-bold">Recommended: </span>
                {formatDistance(rec.distanceMeters)} · {formatDuration(rec.durationSeconds)}
              </p>
              {summary.recommendedIsAlternative ? (
                <p className="text-[#15803d] font-medium">
                  Safer alternative — your first path crossed active alerts in Raasta.
                </p>
              ) : rec.conflicts.length === 0 ? (
                <p className="text-gray-500">No alert conflicts on this path.</p>
              ) : (
                <p className="text-amber-800">Drive with caution near mapped alerts.</p>
              )}
              {summary.textSuggestions && summary.textSuggestions.length > 0 ? (
                <p className="text-gray-500">{summary.textSuggestions.slice(0, 3).join(" · ")}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {!expanded && summary && rec ? (
        <div className="px-3 pb-2 text-[11px] text-gray-600 border-t border-gray-100">
          {formatDistance(rec.distanceMeters)} · {formatDuration(rec.durationSeconds)}
          {summary.recommendedIsAlternative ? " · safer alt" : ""}
        </div>
      ) : null}
    </div>
  );
}
