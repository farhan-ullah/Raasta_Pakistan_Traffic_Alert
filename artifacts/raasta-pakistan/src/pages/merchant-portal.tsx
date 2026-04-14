import { useState, useEffect, useCallback } from "react";
import {
  useCreateMerchant,
  useCreateOffer,
  useGetMerchantOffers,
  useUpdateOffer,
  verifyMerchantPortal,
  getGetMerchantOffersQueryKey,
  type MerchantPortalSession,
} from "@workspace/api-client-react";
import { Store, Plus, Tag, BarChart2, X, KeyRound, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "raasta_merchant_portal_key";

const CATEGORIES = ["restaurant", "cafe", "pharmacy", "shop", "beauty", "massage", "takeaway", "grocery", "bakery", "electronics", "clothing", "other"];

export default function MerchantPortal() {
  const [view, setView] = useState<"login" | "register" | "offers">("login");
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [portalAccessKey, setPortalAccessKey] = useState("");
  const [session, setSession] = useState<MerchantPortalSession | null>(null);
  const [loginKey, setLoginKey] = useState("");
  const [booting, setBooting] = useState(true);
  const [showOfferForm, setShowOfferForm] = useState(false);

  const [merchantForm, setMerchantForm] = useState({
    name: "",
    category: "restaurant",
    description: "",
    phone: "",
    email: "",
    address: "",
    area: "",
    openHours: "",
    lat: 33.6844,
    lng: 73.0479,
  });

  const [offerForm, setOfferForm] = useState({
    title: "",
    description: "",
    discountPercent: "",
    originalPrice: "",
    offerPrice: "",
    code: "",
    radiusKm: "2",
    validUntil: "",
    maxRedemptions: "",
    tags: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMerchant = useCreateMerchant();
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();

  const { data: offers } = useGetMerchantOffers(merchantId ?? "", {
    query: {
      enabled: !!merchantId,
      queryKey: merchantId ? getGetMerchantOffersQueryKey(merchantId) : (["offers", "disabled"] as const),
    },
  });

  const persistKey = useCallback((key: string) => {
    setPortalAccessKey(key);
    try {
      sessionStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* ignore */
    }
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setMerchantId(null);
    setPortalAccessKey("");
    setView("login");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let k = "";
    try {
      k = sessionStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      k = "";
    }
    if (!k.trim()) {
      setBooting(false);
      return;
    }
    verifyMerchantPortal({ accessKey: k.trim() })
      .then((s: MerchantPortalSession) => {
        setSession(s);
        setMerchantId(s.merchantId);
        setPortalAccessKey(k.trim());
        setView("offers");
      })
      .catch(() => {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      })
      .finally(() => setBooting(false));
  }, []);

  const handlePortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = loginKey.trim();
    if (!key) {
      toast({ title: "Enter your access key", variant: "destructive" });
      return;
    }
    try {
      const s = await verifyMerchantPortal({ accessKey: key });
      setSession(s);
      setMerchantId(s.merchantId);
      persistKey(key);
      setView("offers");
      toast({ title: "Welcome", description: s.name });
    } catch {
      toast({ title: "Invalid access key", variant: "destructive" });
    }
  };

  const handleRegisterMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantForm.name || !merchantForm.address) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    try {
      const result = await createMerchant.mutateAsync({
        data: {
          name: merchantForm.name,
          category: merchantForm.category as "restaurant",
          description: merchantForm.description,
          phone: merchantForm.phone,
          email: merchantForm.email,
          address: merchantForm.address,
          city: "Islamabad",
          area: merchantForm.area,
          lat: merchantForm.lat,
          lng: merchantForm.lng,
          openHours: merchantForm.openHours,
        },
      });
      const newId = result.id;
      const key = result.portalAccessKey;
      if (key) {
        persistKey(key);
        toast({
          title: "Save your access key",
          description: "Copy it now — you will need it to sign in on other devices.",
        });
      }
      setMerchantId(newId);
      setSession({
        merchantId: newId,
        name: merchantForm.name,
        category: merchantForm.category,
        address: merchantForm.address,
      });
      setView("offers");
      await queryClient.invalidateQueries();
    } catch {
      toast({ title: "Registration failed", variant: "destructive" });
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId || !portalAccessKey || !offerForm.title || !offerForm.description) {
      toast({ title: "Missing fields or portal key", variant: "destructive" });
      return;
    }
    try {
      await createOffer.mutateAsync({
        data: {
          merchantId,
          portalAccessKey,
          title: offerForm.title,
          description: offerForm.description,
          discountPercent: offerForm.discountPercent ? parseFloat(offerForm.discountPercent) : undefined,
          originalPrice: offerForm.originalPrice ? parseFloat(offerForm.originalPrice) : undefined,
          offerPrice: offerForm.offerPrice ? parseFloat(offerForm.offerPrice) : undefined,
          code: offerForm.code || undefined,
          radiusKm: parseFloat(offerForm.radiusKm) || 2,
          validUntil: offerForm.validUntil || undefined,
          maxRedemptions: offerForm.maxRedemptions ? parseInt(offerForm.maxRedemptions, 10) : undefined,
          tags: offerForm.tags.split(",").map(t => t.trim()).filter(Boolean),
        },
      });
      await queryClient.invalidateQueries();
      setShowOfferForm(false);
      setOfferForm({
        title: "",
        description: "",
        discountPercent: "",
        originalPrice: "",
        offerPrice: "",
        code: "",
        radiusKm: "2",
        validUntil: "",
        maxRedemptions: "",
        tags: "",
      });
      toast({ title: "Offer created!", description: "Your offer is now live." });
    } catch {
      toast({ title: "Failed to create offer", variant: "destructive" });
    }
  };

  const deactivateOffer = async (offerId: string) => {
    if (!portalAccessKey) return;
    await updateOffer.mutateAsync({
      id: offerId,
      data: { isActive: false, portalAccessKey },
    });
    await queryClient.invalidateQueries();
    toast({ title: "Offer deactivated" });
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <p className="text-gray-600 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-[#01411C] px-4 pt-4 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Store className="w-5 h-5" />
              Merchant portal
            </h1>
            <p className="text-green-200 text-xs mt-1">Business owners — use your access key to post offers</p>
          </div>
          {session && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 bg-white/15 text-white border-white/25 hover:bg-white/25"
              onClick={clearSession}
            >
              <LogOut className="w-4 h-4 mr-1" />
              Log out
            </Button>
          )}
        </div>

        {session && (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setView("offers")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                view === "offers" ? "bg-white text-[#01411C]" : "bg-white/15 text-white border border-white/20"
              }`}
            >
              My offers
            </button>
            <button
              type="button"
              onClick={() => setView("register")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                view === "register" ? "bg-white text-[#01411C]" : "bg-white/15 text-white border border-white/20"
              }`}
            >
              Register another business
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        {!session && view === "login" && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base text-[#01411C] flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Sign in with access key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePortalLogin} className="space-y-3">
                <p className="text-sm text-gray-600">Enter the unique key for your shop or restaurant.</p>
                <input
                  value={loginKey}
                  onChange={e => setLoginKey(e.target.value)}
                  placeholder="Access key"
                  type="password"
                  autoComplete="off"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#01411C]"
                />
                <Button type="submit" className="w-full bg-[#01411C] hover:bg-[#025a28] font-bold py-3 rounded-xl">
                  Continue
                </Button>
                <button type="button" className="w-full text-sm text-[#01411C] font-semibold py-2" onClick={() => setView("register")}>
                  New business? Register here
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {!session && view === "register" && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base text-[#01411C] flex items-center gap-2">
                <Store className="w-5 h-5" />
                Register your business
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterMerchant} className="space-y-3">
                <input
                  value={merchantForm.name}
                  onChange={e => setMerchantForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Business name *"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                />
                <select
                  value={merchantForm.category}
                  onChange={e => setMerchantForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c} className="capitalize">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
                <textarea
                  value={merchantForm.description}
                  onChange={e => setMerchantForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Business description"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C] resize-none"
                />
                <input
                  value={merchantForm.phone}
                  onChange={e => setMerchantForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                />
                <input
                  value={merchantForm.email}
                  onChange={e => setMerchantForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email address"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                />
                <input
                  value={merchantForm.address}
                  onChange={e => setMerchantForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Full address *"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                />
                <input
                  value={merchantForm.openHours}
                  onChange={e => setMerchantForm(f => ({ ...f, openHours: e.target.value }))}
                  placeholder="Opening hours (e.g. 9am - 10pm)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                />
                <Button type="submit" disabled={createMerchant.isPending} className="w-full bg-[#01411C] hover:bg-[#025a28] font-bold py-3 rounded-xl">
                  {createMerchant.isPending ? "Registering..." : "Register & receive access key"}
                </Button>
                <button type="button" className="w-full text-sm text-[#01411C] font-semibold py-2" onClick={() => setView("login")}>
                  Already have a key? Sign in
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {session && view === "register" && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base text-[#01411C]">Register another business</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Submitting will log you into the new business and give you a new access key. Save it securely.
              </p>
              <form onSubmit={handleRegisterMerchant} className="space-y-3">
                <input
                  value={merchantForm.name}
                  onChange={e => setMerchantForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Business name *"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                />
                <select
                  value={merchantForm.category}
                  onChange={e => setMerchantForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c} className="capitalize">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
                <textarea
                  value={merchantForm.description}
                  onChange={e => setMerchantForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Business description"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C] resize-none"
                />
                <input
                  value={merchantForm.address}
                  onChange={e => setMerchantForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Full address *"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                />
                <Button type="submit" disabled={createMerchant.isPending} className="w-full bg-[#01411C] hover:bg-[#025a28] font-bold py-3 rounded-xl">
                  {createMerchant.isPending ? "Registering..." : "Register"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {session && view === "offers" && merchantId && portalAccessKey && (
          <div className="space-y-4">
            <div className="rounded-xl bg-white border border-gray-200 p-3 text-sm">
              <p className="font-semibold text-gray-900">{session.name}</p>
              <p className="text-gray-500 text-xs capitalize">{session.category}</p>
            </div>

            <Button
              onClick={() => setShowOfferForm(!showOfferForm)}
              className="w-full bg-[#01411C] hover:bg-[#025a28] font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create new offer
            </Button>

            {showOfferForm && (
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    New offer
                    <button type="button" onClick={() => setShowOfferForm(false)}>
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateOffer} className="space-y-3">
                    <input
                      value={offerForm.title}
                      onChange={e => setOfferForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Offer title *"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                    />
                    <textarea
                      value={offerForm.description}
                      onChange={e => setOfferForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Offer description *"
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C] resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={offerForm.discountPercent}
                        onChange={e => setOfferForm(f => ({ ...f, discountPercent: e.target.value }))}
                        placeholder="Discount %"
                        type="number"
                        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                      />
                      <input
                        value={offerForm.code}
                        onChange={e => setOfferForm(f => ({ ...f, code: e.target.value }))}
                        placeholder="Promo code"
                        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={offerForm.originalPrice}
                        onChange={e => setOfferForm(f => ({ ...f, originalPrice: e.target.value }))}
                        placeholder="Original Rs."
                        type="number"
                        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                      />
                      <input
                        value={offerForm.offerPrice}
                        onChange={e => setOfferForm(f => ({ ...f, offerPrice: e.target.value }))}
                        placeholder="Offer Rs."
                        type="number"
                        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                      />
                    </div>
                    <input
                      value={offerForm.validUntil}
                      onChange={e => setOfferForm(f => ({ ...f, validUntil: e.target.value }))}
                      type="datetime-local"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                    />
                    <input
                      value={offerForm.maxRedemptions}
                      onChange={e => setOfferForm(f => ({ ...f, maxRedemptions: e.target.value }))}
                      placeholder="Max redemptions"
                      type="number"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                    />
                    <input
                      value={offerForm.tags}
                      onChange={e => setOfferForm(f => ({ ...f, tags: e.target.value }))}
                      placeholder="Tags (comma separated)"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#01411C]"
                    />
                    <Button type="submit" disabled={createOffer.isPending} className="w-full bg-[#01411C] hover:bg-[#025a28] font-bold py-3 rounded-xl">
                      {createOffer.isPending ? "Creating..." : "Post offer live"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {offers && offers.length > 0 ? (
              <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#01411C]" />
                  Your offers ({offers.length})
                </h3>
                {offers.map(offer => (
                  <Card key={offer.id} className="border-0 shadow-sm mb-3">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{offer.title}</h4>
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{offer.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {offer.discountPercent && (
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">{offer.discountPercent}% OFF</Badge>
                            )}
                            {offer.currentRedemptions != null && (
                              <span className="text-xs text-gray-500">{offer.currentRedemptions} redeemed</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3">
                          <Badge className={offer.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600"}>
                            {offer.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {offer.isActive && (
                            <button type="button" onClick={() => deactivateOffer(offer.id)} className="text-xs text-red-500 hover:text-red-700">
                              Deactivate
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No offers yet</p>
                <p className="text-sm mt-1">Create your first offer above</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
