import { useParams, Link } from "wouter";
import { useGetOffer, useRedeemOffer, getGetOfferQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, MapPin, Clock, Tag, Star, CheckCircle, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: offer, isLoading } = useGetOffer(id ?? "", {
    query: {
      enabled: !!id,
      queryKey: id ? getGetOfferQueryKey(id) : (["offers", "disabled"] as const),
    },
  });
  const redeemMutation = useRedeemOffer();
  const { toast } = useToast();
  const [redemptionToken, setRedemptionToken] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);

  const handleRedeem = async () => {
    try {
      const result = await redeemMutation.mutateAsync({
        id: id!,
        data: { userId: "user-" + Date.now(), userName: "Customer" }
      });
      setRedemptionToken(result.token);
      setQrData(result.qrData);
      toast({ title: "Offer redeemed!", description: "Show this QR code at the counter." });
    } catch {
      toast({ title: "Redemption failed", description: "Please try again.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-[#01411C] font-medium">Loading offer...</div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Offer not found</p>
          <Link href="/offers"><Button className="mt-4 bg-[#01411C]">Browse Offers</Button></Link>
        </div>
      </div>
    );
  }

  const isExpired = offer.validUntil ? new Date(offer.validUntil) < new Date() : false;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="relative bg-gradient-to-br from-[#01411C] to-[#025a28] text-white">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <Link href="/offers">
            <button className="p-2 bg-white/15 rounded-full hover:bg-white/25 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <span className="font-semibold">Offer Details</span>
        </div>
        <div className="px-4 pb-8 text-center">
          {offer.discountPercent && (
            <div className="text-6xl font-black mb-1">{offer.discountPercent}%</div>
          )}
          {offer.discountAmount && !offer.discountPercent && (
            <div className="text-6xl font-black mb-1">Rs.{offer.discountAmount}</div>
          )}
          <div className="text-lg font-medium opacity-90">OFF</div>
          <div className="mt-4 flex justify-center gap-2">
            {offer.merchantCategory && (
              <Badge className="bg-white/20 text-white border-white/30">{offer.merchantCategory}</Badge>
            )}
            {!isExpired && offer.isActive && (
              <Badge className="bg-green-400/20 text-green-100 border-green-400/30">Active</Badge>
            )}
            {isExpired && (
              <Badge className="bg-red-400/20 text-red-100 border-red-400/30">Expired</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-5">
            <h1 className="text-xl font-bold text-gray-900">{offer.title}</h1>
            <p className="text-gray-600 mt-2 leading-relaxed">{offer.description}</p>
            {(offer.offerPrice != null || offer.originalPrice != null) && (
              <div className="flex items-center gap-3 mt-4 p-3 bg-green-50 rounded-xl">
                <div>
                  {offer.offerPrice != null && (
                    <div className="text-2xl font-black text-[#01411C]">Rs. {offer.offerPrice}</div>
                  )}
                  {offer.originalPrice != null && (
                    <div className="text-sm text-gray-500 line-through">Rs. {offer.originalPrice}</div>
                  )}
                </div>
                {offer.discountPercent && (
                  <div className="ml-auto bg-[#01411C] text-white text-lg font-bold px-3 py-1 rounded-xl">
                    -{offer.discountPercent}%
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-gray-900">Merchant Details</h3>
            <div className="flex items-start gap-2 text-gray-600 text-sm">
              <MapPin className="w-4 h-4 text-[#01411C] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-gray-800">{offer.merchantName}</div>
                <div>{offer.address}</div>
              </div>
            </div>
            {offer.validUntil && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Clock className="w-4 h-4 text-[#01411C] shrink-0" />
                <span>Valid until: {new Date(offer.validUntil).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            )}
            {offer.maxRedemptions != null && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Star className="w-4 h-4 text-[#01411C] shrink-0" />
                <span>{offer.currentRedemptions ?? 0} of {offer.maxRedemptions} redeemed</span>
              </div>
            )}
            {offer.code && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#01411C]" />
                <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                  <span className="text-amber-800 font-mono font-bold text-sm">{offer.code}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {redemptionToken && qrData ? (
          <Card className="border-0 shadow-md border-t-4 border-t-green-500">
            <CardContent className="p-5 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-green-700 font-bold">
                <CheckCircle className="w-5 h-5" />
                Offer Redeemed Successfully
              </div>
              <p className="text-gray-600 text-sm text-center">Show this QR code to the cashier to claim your discount</p>
              <div className="w-44 h-44 bg-white border-4 border-[#01411C] rounded-2xl flex items-center justify-center">
                <div className="grid grid-cols-8 grid-rows-8 gap-0.5 w-36 h-36">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} className={`${Math.random() > 0.45 ? "bg-[#01411C]" : "bg-transparent"} rounded-sm`} />
                  ))}
                </div>
              </div>
              <div className="bg-gray-100 px-4 py-1.5 rounded-full font-mono text-xs text-gray-700">
                {qrData.substring(0, 24)}...
              </div>
              <p className="text-xs text-gray-500">Token expires in 30 minutes</p>
            </CardContent>
          </Card>
        ) : (
          <Button
            onClick={handleRedeem}
            disabled={isExpired || !offer.isActive || redeemMutation.isPending}
            className="w-full py-6 text-base font-bold bg-[#01411C] hover:bg-[#025a28] rounded-2xl"
          >
            <QrCode className="w-5 h-5 mr-2" />
            {redeemMutation.isPending ? "Generating QR Code..." : isExpired ? "Offer Expired" : "Redeem Offer - Get QR Code"}
          </Button>
        )}
      </div>
    </div>
  );
}
