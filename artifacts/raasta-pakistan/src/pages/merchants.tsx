import { useState } from "react";
import { useListMerchants } from "@workspace/api-client-react";
import { Store, MapPin, Star, Tag, Search, ChevronRight, UtensilsCrossed, Coffee, Pill, Scissors, ShoppingBag, Bike, ShoppingCart, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  pharmacy: Pill,
  beauty: Scissors,
  shop: ShoppingBag,
  takeaway: Bike,
  grocery: ShoppingCart,
  massage: Wrench,
  other: Store,
};

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "restaurant", label: "Restaurants" },
  { value: "cafe", label: "Cafes" },
  { value: "pharmacy", label: "Pharmacies" },
  { value: "beauty", label: "Beauty" },
  { value: "shop", label: "Shops" },
  { value: "takeaway", label: "Takeaway" },
  { value: "grocery", label: "Grocery" },
  { value: "massage", label: "Wellness" },
];

export default function Merchants() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");

  const { data: merchants, isLoading } = useListMerchants(
    selectedCategory ? { category: selectedCategory } : undefined
  );

  const filtered = merchants?.filter(m =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.area?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 bg-[#01411C] text-white px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold mb-3 flex items-center gap-2">
          <Store className="w-5 h-5" />
          Shops & Merchants
        </h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shops, restaurants..."
            className="w-full bg-white/15 text-white placeholder:text-white/60 border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white/25"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.value
                  ? "bg-white text-[#01411C]"
                  : "bg-white/15 text-white border border-white/20"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl" />
          ))
        ) : filtered && filtered.length > 0 ? (
          filtered.map(merchant => {
            const Icon = CATEGORY_ICONS[merchant.category] || Store;
            return (
              <Link key={merchant.id} href={`/merchants/${merchant.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm mb-3">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#01411C]/10 rounded-2xl flex items-center justify-center shrink-0">
                      <Icon className="w-7 h-7 text-[#01411C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{merchant.name}</h3>
                        {merchant.isVerified && (
                          <span className="text-blue-500 text-xs shrink-0">Verified</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{merchant.area || merchant.city}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {merchant.rating != null && (
                          <div className="flex items-center gap-1 text-amber-500 text-xs">
                            <Star className="w-3 h-3 fill-amber-500" />
                            <span className="font-medium">{merchant.rating.toFixed(1)}</span>
                          </div>
                        )}
                        {(merchant.activeOffersCount ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-[#01411C] text-xs font-medium">
                            <Tag className="w-3 h-3" />
                            <span>{merchant.activeOffersCount} offers</span>
                          </div>
                        )}
                        <Badge
                          className={`text-xs ml-auto ${merchant.isOpen ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                        >
                          {merchant.isOpen ? "Open" : "Closed"}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-16 text-gray-500">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No merchants found</p>
          </div>
        )}
      </div>
    </div>
  );
}
