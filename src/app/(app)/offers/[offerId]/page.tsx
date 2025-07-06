
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Offer, MenuItem as MenuItemType } from '@/lib/types';
import { getOffers, getMenuItems } from '@/app/actions/data-management-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CalendarDays, Tag, Info, Gift } from 'lucide-react';
import Image from 'next/image';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

export default function OfferDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const offerId = params.offerId as string;
  const { currencySymbol } = useCurrency();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [linkedItems, setLinkedItems] = useState<MenuItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!offerId) {
        setError("Offer ID not provided.");
        setIsLoading(false);
        return;
    };

    async function fetchOfferDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const [allOffers, allMenuItems] = await Promise.all([getOffers(), getMenuItems()]);
        const foundOffer = allOffers.find(o => o.id === offerId);

        if (foundOffer) {
          setOffer(foundOffer);
          if (foundOffer.linkedMenuItemIds) {
            const ids = new Set(foundOffer.linkedMenuItemIds.split(',').map(id => id.trim()));
            const items = allMenuItems.filter(item => ids.has(item.id));
            setLinkedItems(items);
          }
        } else {
          setError("Offer not found.");
        }
      } catch (err) {
        setError("Failed to load offer details.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOfferDetails();
  }, [offerId]);

  const renderOfferDetails = (offerData: Offer) => {
    try {
      const details = JSON.parse(offerData.details || '{}');
      switch (offerData.type) {
        case 'discount_on_item':
          if (details.discountPercent) return <p><strong>Discount:</strong> {details.discountPercent}% off on linked item(s).</p>;
          if (details.discountAmount) return <p><strong>Discount:</strong> {currencySymbol}{Number(details.discountAmount).toFixed(2)} off on linked item(s).</p>;
          return <p>A special discount is available on select items.</p>;
        case 'combo_deal':
          if (details.comboPrice) return <p><strong>Deal Price:</strong> Get the linked items together for just {currencySymbol}{Number(details.comboPrice).toFixed(2)}!</p>;
          return <p>A special combination deal on select items.</p>;
        case 'free_item_with_purchase':
          return <p>Buy a required item and get another one for free!</p>;
        default:
          return <p>A special seasonal offer.</p>;
      }
    } catch {
      return <p>Details for this offer could not be displayed.</p>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (error) {
    return (
        <Card className="max-w-2xl mx-auto my-8">
            <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
            <CardContent><p>{error}</p></CardContent>
            <CardFooter>
                 <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/> Go Back</Button>
            </CardFooter>
        </Card>
    );
  }

  if (!offer) {
    return (
        <Card className="max-w-2xl mx-auto my-8">
            <CardHeader><CardTitle>Offer Not Found</CardTitle></CardHeader>
            <CardContent><p>The offer you are looking for does not exist or may have expired.</p></CardContent>
            <CardFooter>
                 <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/> Go Back</Button>
            </CardFooter>
        </Card>
    );
  }

  const formattedValidFrom = offer.validFrom ? format(parseISO(offer.validFrom), 'MMM d, yyyy') : 'N/A';
  const formattedValidTo = offer.validTo ? format(parseISO(offer.validTo), 'MMM d, yyyy') : 'N/A';
  const isCurrentlyActive = offer.isActive && (!offer.validFrom || !isFuture(parseISO(offer.validFrom))) && (!offer.validTo || !isPast(parseISO(offer.validTo)));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-6"><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
        <Card className="shadow-xl">
            {offer.imageUrl && (
                <div className="relative w-full h-64 rounded-t-lg overflow-hidden">
                    <Image src={offer.imageUrl} alt={offer.title} fill sizes="100vw" className="object-cover" data-ai-hint={offer.aiHint || offer.title.toLowerCase()} />
                </div>
            )}
            <CardHeader>
                <Badge variant="outline" className="w-fit mb-2 capitalize text-accent border-accent">{offer.type.replace(/_/g, ' ')}</Badge>
                <CardTitle className="font-headline text-4xl text-primary">{offer.title}</CardTitle>
                {offer.description && <CardDescription className="text-lg">{offer.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-md space-y-2">
                    <h3 className="font-semibold text-lg flex items-center"><Info className="mr-2 h-5 w-5 text-primary" />Offer Details</h3>
                    <div className="text-md">{renderOfferDetails(offer)}</div>
                </div>

                <div className="p-4 bg-muted/50 rounded-md space-y-2">
                     <h3 className="font-semibold text-lg flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary" />Validity</h3>
                    <p><strong>Available From:</strong> {formattedValidFrom}</p>
                    <p><strong>Available Until:</strong> {formattedValidTo}</p>
                    <p><strong>Status:</strong> <span className={isCurrentlyActive ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{isCurrentlyActive ? "Active" : "Inactive/Expired"}</span></p>
                </div>
                
                {linkedItems.length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-md space-y-2">
                        <h3 className="font-semibold text-lg flex items-center"><Gift className="mr-2 h-5 w-5 text-primary" />Applicable Items</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {linkedItems.map(item => (
                                <Link href="/menu" key={item.id}>
                                    <div className="flex items-center gap-3 p-2 border rounded-md hover:bg-accent/20 transition-colors cursor-pointer">
                                        <Image src={item.imageUrl} alt={item.name} width={50} height={50} className="rounded-md object-cover"/>
                                        <div>
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.category}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full sm:w-auto"><Link href="/menu">Go to Menu</Link></Button>
            </CardFooter>
        </Card>
    </div>
  );
}
