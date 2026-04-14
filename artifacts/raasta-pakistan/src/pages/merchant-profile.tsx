import { useParams, Link } from "wouter";
import {
  useGetMerchant,
  useGetMerchantOffers,
  getGetMerchantQueryKey,
  getGetMerchantOffersQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, MapPin, Phone, Mail, Star, Clock, Tag, Store, UtensilsCrossed, Coffee, Pill, Scissors, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  pharmacy: Pill,
  beauty: Scissors,
  shop: ShoppingBag,
  other: Store,
};

export default function MerchantProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: merchant, isLoading: loadingMerchant } = useGetMerchant(id ?? "", {
    query: {
      enabled: !!id,
      queryKey: id ? getGetMerchantQueryKey(id) : (["merchants", "disabled"] as const),
    },
  });
  const { data: offers } = useGetMerchantOffers(id ?? "", {
    query: {
      enabled: !!id,
      queryKey: id ? getGetMerchantOffersQueryKey(id) : (["merchants", "offers", "disabled"] as const),
    },
  });

  if (loadingMerchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-[#01411C] font-medium">Loading merchant...</div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Merchant not found</p>
      </div>
    );
  }

  const Icon = CATEGORY_ICONS[merchant.category] || Store;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-gradient-to-br from-[#01411C] to-[#025a28] text-white">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <Link href="/merchants">
            <button className="p-2 bg-white/15 rounded-full hover:bg-white/25 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <span className="font-semibold">Merchant Profile</span>
        </div>
        <div className="px-4 pb-8 flex items-start gap-4">
          <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center shrink-0">
            <Icon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">{merchant.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-white/20 text-white border-white/30 capitalize">{merchant.category}</Badge>
              {merchant.isVerified && (
                <Badge className="bg-blue-400/20 text-blue-100 border-blue-400/30">Verified</Badge>
              )}
              <Badge className={merchant.isOpen ? "bg-green-400/20 text-green-100 border-green-400/30" : "bg-red-400/20 text-red-100 border-red-400/30"}>
                {merchant.isOpen ? "Open Now" : "Closed"}
              </Badge>
            </div>
            {merchant.rating != null && (
              <div className="flex items-center gap-1 mt-2 text-amber-300">
                <Star className="w-4 h-4 fill-amber-300" />
                <span className="font-bold">{merchant.rating.toFixed(1)}</span>
                {merchant.reviewCount != null && (
                  <span className="text-white/60 text-sm">({merchant.reviewCount} reviews)</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-5 space-y-3">
            {merchant.description && (
              <p className="text-gray-600 leading-relaxed">{merchant.description}</p>
            )}
            <div className="flex items-start gap-2 text-gray-600 text-sm">
              <MapPin className="w-4 h-4 text-[#01411C] mt-0.5 shrink-0" />
              <span>{merchant.address}, {merchant.city}</span>
            </div>
            {merchant.phone && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Phone className="w-4 h-4 text-[#01411C]" />
                <span>{merchant.phone}</span>
              </div>
            )}
            {merchant.email && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Mail className="w-4 h-4 text-[#01411C]" />
                <span>{merchant.email}</span>
              </div>
            )}
            {merchant.openHours && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Clock className="w-4 h-4 text-[#01411C]" />
                <span>{merchant.openHours}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {offers && offers.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#01411C]" />
              Active Offers ({offers.length})
            </h2>
            <div className="space-y-3">
              {offers.map(offer => (
                <Link key={offer.id} href={`/offers/${offer.id}`}>
                  <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-3">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-14 h-14 bg-[#01411C] rounded-2xl flex items-center justify-center shrink-0">
                        {offer.discountPercent ? (
                          <div className="text-white text-center">
                            <div className="text-lg font-black leading-none">{offer.discountPercent}%</div>
                            <div className="text-xs opacity-80">OFF</div>
                          </div>
                        ) : (
                          <Tag className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{offer.title}</h4>
                        <p className="text-gray-500 text-xs mt-0.5 truncate">{offer.description}</p>
                        {offer.code && (
                          <div className="mt-1">
                            <span className="text-xs bg-amber-50 border border-amber-200 text-amber-800 font-mono px-2 py-0.5 rounded">
                              {offer.code}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
