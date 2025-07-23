
"use client";

import type { Offer } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Tag, Info } from 'lucide-react';
import { format, parseISO, isPast, isFuture, isValid } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';
import React from 'react';

interface OfferCardProps {
  offer: Offer;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer }) => {
  const { currencySymbol } = useCurrency();

  const parsedValidFrom = offer.validFrom ? parseISO(offer.validFrom) : null;
  const parsedValidTo = offer.validTo ? parseISO(offer.validTo) : null;

  const formattedValidFrom = parsedValidFrom && isValid(parsedValidFrom) ? format(parsedValidFrom, 'MMM d, yyyy') : 'N/A';
  const formattedValidTo = parsedValidTo && isValid(parsedValidTo) ? format(parsedValidTo, 'MMM d, yyyy') : 'N/A';
  
  let validityStatus = "Ongoing";
  let validityColor = "text-green-600";
  if (parsedValidFrom && isFuture(parsedValidFrom)) {
    validityStatus = `Starts ${formattedValidFrom}`;
    validityColor = "text-blue-600";
  } else if (parsedValidTo && isPast(parsedValidTo)) {
    validityStatus = `Ended ${formattedValidTo}`;
    validityColor = "text-red-600";
  } else if (!offer.isActive) {
    validityStatus = "Inactive";
    validityColor = "text-gray-500";
  }

  const isCurrentlyActive = offer.isActive && 
                           (!parsedValidFrom || !isFuture(parsedValidFrom)) && 
                           (!parsedValidTo || !isPast(parsedValidTo));

  const offerDetailText = React.useMemo(() => {
    try {
        const details = JSON.parse(offer.details || '{}');
        switch (offer.type) {
            case 'discount_on_item':
                if (details.discountPercent) return `Get ${details.discountPercent}% off!`;
                if (details.discountAmount) return `Get ${currencySymbol}${Number(details.discountAmount).toFixed(2)} off!`;
                break;
            case 'combo_deal':
                if (details.comboPrice) return `Special combo for ${currencySymbol}${Number(details.comboPrice).toFixed(2)}`;
                break;
            case 'free_item_with_purchase':
                return `Buy one, get one free on select items.`;
            default:
                return null;
        }
    } catch {
        return null;
    }
    return null;
  }, [offer.type, offer.details, currencySymbol]);


  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      {offer.imageUrl && (
        <div className="relative w-full h-48 sm:h-52">
          <Image
            src={offer.imageUrl}
            alt={offer.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            data-ai-hint={offer.aiHint || offer.title.toLowerCase().split(' ').slice(0,2).join(' ')}
          />
        </div>
      )}
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="font-headline text-xl text-primary line-clamp-2">{offer.title}</CardTitle>
        <Badge variant="outline" className="w-fit text-xs capitalize">
            <Tag className="mr-1.5 h-3 w-3"/> {offer.type.replace(/_/g, ' ')}
        </Badge>
      </CardHeader>
      <CardContent className="flex-grow">
        {offer.description && (
            <CardDescription className="text-foreground/80 text-sm line-clamp-3 mb-2">
                {offer.description}
            </CardDescription>
        )}
        {offerDetailText && (
            <p className="text-sm font-semibold text-accent mb-2">{offerDetailText}</p>
        )}
        <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5"/>
                Validity: {formattedValidFrom} - {formattedValidTo}
            </p>
            <p className={`flex items-center font-medium ${validityColor}`}>
                <Info className="mr-1.5 h-3.5 w-3.5"/>
                Status: {validityStatus}
            </p>
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/offers/${offer.id}`}>{offerDetailText || 'View Details'}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default OfferCard;
