import { useState, useEffect, useRef } from "react";
import { useGetActiveMapIncidents, useListOffers } from "@workspace/api-client-react";
import { LiveMap } from "@/components/map";
import { AlertTriangle, Tag, ShieldAlert, Store, Radio } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

const REFETCH_MS = 15_000;

export default function Home() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [tickerIdx, setTickerIdx] = useState(0);

  const { data: incidentsRaw, dataUpdatedAt } = useGetActiveMapIncidents({
    query: { refetchInterval: REFETCH_MS },
  });
  const { data: offersRaw } = useListOffers({
    query: { refetchInterval: REFETCH_MS },
  });

  const incidents = Array.isArray(incidentsRaw) ? incidentsRaw : [];
  const offers = Array.isArray(offersRaw) ? offersRaw : [];

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdated(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  useEffect(() => {
    const id = setInterval(() => setSecondsAgo(Math.round((Date.now() - lastUpdated.getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const criticalIncidents = incidents.filter(i => i.severity === "critical" || i.severity === "high");

  useEffect(() => {
    if (criticalIncidents.length <= 1) return;
    const id = setInterval(() => setTickerIdx(p => (p + 1) % criticalIncidents.length), 4000);
    return () => clearInterval(id);
  }, [criticalIncidents.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full min-h-0 bg-background"
    >
      {/* Header */}
      <div className="bg-[#01411C] text-white px-4 pt-4 pb-3 shadow-md z-10 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-black tracking-tight">Raasta Pakistan</h1>
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-green-300 font-medium">
              {secondsAgo < 5 ? "Just updated" : `${secondsAgo}s ago`}
            </div>
            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          </div>
        </div>

        {criticalIncidents.length > 0 && (
          <div className="bg-red-500/20 border border-red-400/40 rounded-xl px-3 py-2 flex items-center gap-2 overflow-hidden">
            <Radio className="w-4 h-4 text-red-300 shrink-0 animate-pulse" />
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tickerIdx}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs text-red-100 font-semibold truncate"
                >
                  <span className="text-red-300 mr-2">
                    {criticalIncidents[tickerIdx]?.severity === "critical" ? "🔴 CRITICAL:" : "🟠 HIGH:"}
                  </span>
                  {criticalIncidents[tickerIdx]?.title}
                </motion.div>
              </AnimatePresence>
            </div>
            {criticalIncidents.length > 1 && (
              <span className="text-[10px] text-red-300 shrink-0 font-bold">
                {tickerIdx + 1}/{criticalIncidents.length}
              </span>
            )}
          </div>
        )}

        {criticalIncidents.length === 0 && (
          <div className="bg-green-500/20 border border-green-400/30 rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-200 font-medium">All clear — no critical incidents right now</span>
          </div>
        )}
      </div>

      {/* Live map fills all space between header and featured offers */}
      <div className="relative w-full flex-1 min-h-0 flex flex-col">
        <LiveMap
          incidents={incidents}
          offers={offers}
          lastUpdated={lastUpdated}
          className="flex-1 w-full min-h-0"
        />

        {/* Floating quick nav */}
        <div className="absolute bottom-3 left-0 right-0 px-3 z-[500] pointer-events-none [&_a]:pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl flex justify-around items-center border border-white/30">
            <Link href="/traffic" className="flex flex-col items-center p-2 text-[#01411C] hover:bg-[#01411C]/10 rounded-xl transition-colors">
              <ShieldAlert className="h-6 w-6 mb-0.5" />
              <span className="text-[10px] font-bold">Traffic</span>
              {incidents.filter(i => i.severity === "critical").length > 0 && (
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full absolute top-2 right-2" />
              )}
            </Link>
            <Link href="/offers" className="flex flex-col items-center p-2 text-[#01411C] hover:bg-[#01411C]/10 rounded-xl transition-colors">
              <Tag className="h-6 w-6 mb-0.5" />
              <span className="text-[10px] font-bold">Offers</span>
            </Link>
            <Link href="/merchants" className="flex flex-col items-center p-2 text-[#01411C] hover:bg-[#01411C]/10 rounded-xl transition-colors">
              <Store className="h-6 w-6 mb-0.5" />
              <span className="text-[10px] font-bold">Shops</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Offers — fixed strip so the map can use flex-1 above */}
      <div className="bg-gray-50 pt-4 pb-6 shrink-0">
        <div className="px-4 flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-[#01411C]" />
            Featured Nearby Offers
          </h2>
          <Link href="/offers" className="text-xs text-[#01411C] font-semibold hover:underline">
            View all →
          </Link>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-3 px-4 pb-1">
            {offers.slice(0, 5).map((offer) => (
              <Link key={offer.id} href={`/offers/${offer.id}`}>
                <Card className="w-[210px] shrink-0 cursor-pointer border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-20 bg-gradient-to-br from-[#01411C] to-[#025a28] relative flex items-center justify-center">
                    <div className="text-white text-center">
                      {offer.discountPercent && (
                        <div className="text-3xl font-black leading-none">{offer.discountPercent}%</div>
                      )}
                      <div className="text-xs font-medium opacity-80">OFF</div>
                    </div>
                    {offer.code && (
                      <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {offer.code}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm truncate leading-tight">{offer.title}</h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{offer.merchantName}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px] bg-[#01411C]/10 text-[#01411C]">
                        {offer.merchantCategory}
                      </Badge>
                      {offer.offerPrice != null && (
                        <span className="text-sm font-bold text-[#01411C]">Rs. {offer.offerPrice}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>
    </motion.div>
  );
}
