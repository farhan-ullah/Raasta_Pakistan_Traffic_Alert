import { useState } from "react";
import { useListOffers } from "@workspace/api-client-react";
import { Tag, MapPin, Clock, Filter, ShoppingBag, Pill, Scissors, UtensilsCrossed, Coffee, Bike, ShoppingCart, Wheat, Wrench, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

const CATEGORIES = [
  { value: "", label: "All", icon: ShoppingBag },
  { value: "restaurant", label: "Restaurants", icon: UtensilsCrossed },
  { value: "cafe", label: "Cafes", icon: Coffee },
  { value: "pharmacy", label: "Pharmacies", icon: Pill },
  { value: "beauty", label: "Beauty", icon: Scissors },
  { value: "shop", label: "Shops", icon: ShoppingBag },
  { value: "takeaway", label: "Takeaway", icon: Bike },
  { value: "grocery", label: "Grocery", icon: ShoppingCart },
  { value: "massage", label: "Wellness", icon: Wrench },
];

export default function Offers() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");

  const { data: offers, isLoading } = useListOffers(
    selectedCategory ? { category: selectedCategory } : undefined
  );

  const filtered = offers?.filter(o =>
    !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.merchantName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 bg-[#01411C] text-white px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold mb-3 flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Live Offers Near You
        </h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search offers or shops..."
            className="w-full bg-white/15 text-white placeholder:text-white/60 border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white/25"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.value
                    ? "bg-white text-[#01411C]"
                    : "bg-white/15 text-white border border-white/20"
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 bg-gray-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map(offer => (
              <Link key={offer.id} href={`/offers/${offer.id}`}>
                <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-0 shadow-sm">
                  <div className="relative bg-gradient-to-br from-[#01411C] to-[#025a28] h-28 flex items-center justify-center">
                    <div className="text-center text-white">
                      {offer.discountPercent && (
                        <div className="text-4xl font-black">{offer.discountPercent}%</div>
                      )}
                      <div className="text-sm font-medium opacity-90">OFF</div>
                    </div>
                    {offer.merchantCategory && (
                      <Badge className="absolute top-3 left-3 bg-white/20 text-white border-white/30 text-xs">
                        {offer.merchantCategory}
                      </Badge>
                    )}
                    {offer.code && (
                      <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-lg">
                        {offer.code}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-gray-900 text-base leading-snug">{offer.title}</h3>
                    <p className="text-gray-600 text-sm mt-0.5 line-clamp-2">{offer.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <MapPin className="w-3 h-3" />
                        <span>{offer.merchantName}</span>
                      </div>
                      {offer.validUntil && (
                        <div className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(offer.validUntil) > new Date()
                              ? `Ends ${new Date(offer.validUntil).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}`
                              : "Expired"}
                          </span>
                        </div>
                      )}
                    </div>
                    {offer.offerPrice != null && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[#01411C] font-bold text-lg">Rs. {offer.offerPrice}</span>
                        {offer.originalPrice != null && (
                          <span className="text-gray-400 line-through text-sm">Rs. {offer.originalPrice}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No offers found</p>
            <p className="text-sm mt-1">Try a different category or search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
