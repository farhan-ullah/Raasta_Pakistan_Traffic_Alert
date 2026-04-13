import { useState, useRef } from "react";
import { Camera, MapPin, AlertTriangle, CheckCircle, ImagePlus, X, Video, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { GeocodePlace } from "@workspace/api-client-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { getWebApiOrigin } from "@/constants/apiOrigin";

const INCIDENT_TYPES = [
  { value: "blockage", label: "Road Blocked", emoji: "🚫", color: "bg-red-100 text-red-700 border-red-300" },
  { value: "accident", label: "Accident", emoji: "💥", color: "bg-red-100 text-red-800 border-red-300" },
  { value: "construction", label: "Construction", emoji: "🚧", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "congestion", label: "Traffic Jam", emoji: "🚗", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "vip_movement", label: "VIP Movement", emoji: "👑", color: "bg-purple-100 text-purple-700 border-purple-300" },
];

function PhotoThumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-[#01411C]/30">
      <img src={src} alt="incident" className="w-full h-full object-cover" />
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function CitizenReport() {
  const [type, setType] = useState("blockage");
  const [place, setPlace] = useState<GeocodePlace | null>(null);
  const [locQuery, setLocQuery] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (photos.length >= 4) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!place || !description) {
      toast({ title: "Missing fields", description: "Choose a location from search and describe the situation.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const mediaUrls = [...photos, ...(videoUrl ? [videoUrl] : [])];
      const headline = place.area ?? place.fullName.split(",")[0]?.trim() ?? "Location";
      const locationStr = [place.fullName, locationDetail.trim()].filter(Boolean).join(", ");
      const payload = {
        type,
        title: `${INCIDENT_TYPES.find(t => t.value === type)?.label} — ${headline}`,
        description,
        location: locationStr,
        area: place.area ?? "",
        city: place.state ?? "Unknown",
        lat: place.lat,
        lng: place.lng,
        severity: "medium",
        reportedBy: "citizen",
        reporterPhone: phone || undefined,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        isVerifiedByPolice: false,
      };

      const res = await fetch(`${getWebApiOrigin()}/api/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit");

      await queryClient.invalidateQueries();
      setSubmitted(true);
    } catch {
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Report Submitted!</h2>
        <p className="text-gray-500 text-center mb-2">Your incident report is now live and visible to all Raasta users.</p>
        <p className="text-sm text-gray-400 text-center mb-8">Police will verify and update your report shortly.</p>
        <div className="flex gap-3">
          <Button
            onClick={() => { setSubmitted(false); setType("blockage"); setPlace(null); setLocQuery(""); setLocationDetail(""); setDescription(""); setPhotos([]); setVideoUrl(""); setPhone(""); }}
            variant="outline"
            className="border-[#01411C] text-[#01411C]"
          >
            Report Another
          </Button>
          <Button
            onClick={() => window.history.back()}
            className="bg-[#01411C] hover:bg-[#025a28]"
          >
            View Map
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#01411C] text-white px-4 pt-4 pb-5">
        <h1 className="text-xl font-black flex items-center gap-2">
          <Camera className="w-6 h-6" />
          Report an Incident
        </h1>
        <p className="text-green-200 text-xs mt-1">Help your community — reports go live instantly</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Incident Type */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">What happened? *</h3>
            <div className="grid grid-cols-2 gap-2">
              {INCIDENT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                    type === t.value
                      ? "border-[#01411C] bg-[#01411C]/5"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className={`text-xs font-bold ${type === t.value ? "text-[#01411C]" : "text-gray-700"}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#01411C]" />
              Photos / Video (optional)
            </h3>
            <div className="flex flex-wrap gap-3">
              {photos.map((src, i) => (
                <PhotoThumb key={i} src={src} onRemove={() => setPhotos(p => p.filter((_, idx) => idx !== i))} />
              ))}
              {photos.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-[#01411C]/40 flex flex-col items-center justify-center gap-1 text-[#01411C]/60 hover:bg-[#01411C]/5 transition-colors"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-[10px] font-medium">Add Photo</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handlePhotoCapture}
            />
            <div className="mt-3">
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                <Video className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="Paste video link (YouTube, WhatsApp, etc.)"
                  className="flex-1 text-sm focus:outline-none text-gray-700 placeholder:text-gray-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-gray-800 mb-1 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#01411C]" />
              Location *
            </h3>
            <p className="text-xs text-gray-500 mb-2">Search any place — region is detected automatically.</p>
            <LocationAutocomplete
              value={locQuery}
              onChange={(v) => {
                setLocQuery(v);
                if (place && v !== place.fullName) setPlace(null);
              }}
              selected={place}
              onSelect={(p) => {
                setPlace(p);
                setLocQuery(p.fullName);
              }}
              placeholder="e.g. Blue Area Islamabad, Saddar Karachi…"
            />
            <input
              value={locationDetail}
              onChange={e => setLocationDetail(e.target.value)}
              placeholder="Extra detail (optional) — e.g. near bus stop, lane 2"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C] placeholder:text-gray-400 mt-2"
            />
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#01411C]" />
              Describe the Situation *
            </h3>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what you see — road condition, how many lanes blocked, traffic direction affected..."
              rows={4}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C] resize-none"
            />
            <div className="text-xs text-gray-400 mt-1 text-right">{description.length}/300</div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#01411C]" />
              Your Phone (optional)
            </h3>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="03XX-XXXXXXX — for police follow-up only"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
            />
            <p className="text-xs text-gray-400 mt-1.5">Your number is never shown publicly</p>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
          <strong>Note:</strong> False reports are a civic offence. Only report genuine incidents you can see.
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full py-6 text-base font-black bg-[#01411C] hover:bg-[#025a28] rounded-2xl flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          {submitting ? "Submitting Report..." : "Submit Live Report"}
        </Button>
      </form>
    </div>
  );
}
