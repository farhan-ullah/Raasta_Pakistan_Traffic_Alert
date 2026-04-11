import { useGetActiveMapIncidents, useListOffers } from "@workspace/api-client-react";
import { LiveMap } from "@/components/map";
import { AlertTriangle, Tag, Navigation, ShieldAlert, Store } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

export default function Home() {
  const { data: incidents = [] } = useGetActiveMapIncidents();
  const { data: offers = [] } = useListOffers();

  const criticalIncidents = incidents.filter(i => i.severity === "critical");

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-background"
    >
      {/* Header / Alerts Ticker */}
      <div className="bg-primary text-primary-foreground p-3 shadow-md z-10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Raasta Pakistan</h1>
          <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            LIVE
          </div>
        </div>
        
        {criticalIncidents.length > 0 && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-md p-2 flex items-start gap-2 overflow-hidden">
            <AlertTriangle className="text-red-300 shrink-0 h-4 w-4 mt-0.5" />
            <div className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-xs text-red-100 font-medium">
              <span className="mr-4">CRITICAL ALERTS:</span>
              {criticalIncidents.map(i => i.title).join(" • ")}
            </div>
          </div>
        )}
      </div>

      {/* Live Map Area */}
      <div className="flex-1 relative min-h-[40vh]">
        <LiveMap incidents={incidents} offers={offers} />
        
        {/* Quick Nav Overlay */}
        <div className="absolute bottom-4 left-0 right-0 px-4 z-20">
          <div className="bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg flex justify-around items-center border border-white/20">
            <Link href="/traffic" className="flex flex-col items-center p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
              <ShieldAlert className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-bold">Traffic</span>
            </Link>
            <Link href="/offers" className="flex flex-col items-center p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
              <Tag className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-bold">Offers</span>
            </Link>
            <Link href="/merchants" className="flex flex-col items-center p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
              <Store className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-bold">Shops</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Offers */}
      <div className="bg-gray-50 pt-4 pb-6">
        <div className="px-4 flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1">
            <Tag className="h-4 w-4 text-primary" />
            Featured Nearby Offers
          </h2>
          <Link href="/offers" className="text-xs text-primary font-medium hover:underline">View all</Link>
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-4 p-4 pt-0">
            {offers.slice(0, 5).map((offer) => (
              <Link key={offer.id} href={`/offers/${offer.id}`}>
                <Card className="w-[240px] shrink-0 hover-elevate cursor-pointer border-border overflow-hidden transition-all duration-200 hover:shadow-md">
                  <div className="h-24 bg-gray-200 relative">
                    {offer.imageUrl ? (
                      <img src={offer.imageUrl} alt={offer.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <Store className="h-8 w-8 opacity-20" />
                      </div>
                    )}
                    {offer.discountPercent && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                        {offer.discountPercent}% OFF
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm truncate">{offer.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{offer.merchantName}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20">{offer.merchantCategory}</Badge>
                      {offer.offerPrice && <span className="text-sm font-bold text-primary">Rs. {offer.offerPrice}</span>}
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
