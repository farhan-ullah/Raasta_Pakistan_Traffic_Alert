import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { fetchGeocodeSearch, type GeocodePlace } from "@workspace/api-client-react";
import { MapPin, Loader2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  selected: GeocodePlace | null;
  onSelect: (place: GeocodePlace) => void;
  placeholder?: string;
  variant?: "light" | "dark";
  disabled?: boolean;
  id?: string;
};

export function LocationAutocomplete({
  value,
  onChange,
  selected,
  onSelect,
  placeholder = "Search for a place…",
  variant = "light",
  disabled,
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodePlace[]>([]);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetchGeocodeSearch(q)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const inputClass =
    variant === "dark"
      ? "w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40"
      : "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C] placeholder:text-gray-400";

  const listClass =
    variant === "dark"
      ? "absolute z-50 w-full mt-1 max-h-56 overflow-auto rounded-xl border border-white/15 bg-gray-950 shadow-xl py-1"
      : "absolute z-50 w-full mt-1 max-h-56 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl py-1";

  const itemClass = (active: boolean) =>
    variant === "dark"
      ? `flex gap-2 px-3 py-2.5 text-left text-xs cursor-pointer ${active ? "bg-white/10" : "hover:bg-white/5"}`
      : `flex gap-2 px-3 py-2.5 text-left text-xs cursor-pointer ${active ? "bg-[#01411C]/8" : "hover:bg-gray-50"}`;

  const pick = (p: GeocodePlace) => {
    onSelect(p);
    setOpen(false);
    setSuggestions([]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[highlight]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <MapPin
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
            variant === "dark" ? "text-gray-500" : "text-gray-400"
          }`}
        />
        <input
          id={id}
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`${inputClass} pl-9`}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        ) : null}
      </div>
      {selected ? (
        <p className={`mt-1.5 text-[11px] ${variant === "dark" ? "text-green-300/95" : "text-[#01411C]/90"}`}>
          {selected.state ? `${selected.state} · ` : null}lat {selected.lat.toFixed(4)}, lng {selected.lng.toFixed(4)}
        </p>
      ) : (
        <p className={`mt-1.5 text-[11px] ${variant === "dark" ? "text-amber-200/90" : "text-amber-800/90"}`}>
          Pick a suggestion so we can set coordinates and province/region.
        </p>
      )}
      {open && suggestions.length > 0 ? (
        <ul className={listClass} role="listbox">
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={`${itemClass(i === highlight)} w-full border-0 ${
                  variant === "dark" ? "text-white" : "text-gray-800"
                }`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(s)}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
                <span>
                  <span className="font-semibold block leading-snug">{s.label}</span>
                  <span className={`${variant === "dark" ? "text-gray-400" : "text-gray-500"} block mt-0.5 line-clamp-2`}>
                    {s.fullName}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
