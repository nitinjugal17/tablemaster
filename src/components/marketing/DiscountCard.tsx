
"use client";

import type { DiscountCode } from '@/lib/types';
import { BASE_CURRENCY_CODE } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Percent, Tag, CheckCircle, XCircle, Copy, Info } from 'lucide-react';
import { format, parseISO, isPast, isFuture, isValid } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface DiscountCardProps {
  discount: DiscountCode;
}

const DiscountCard: React.FC<DiscountCardProps> = ({ discount }) => {
  const { currencySymbol } = useCurrency();
  const { toast } = useToast();

  const parsedValidFrom = discount.validFrom ? parseISO(discount.validFrom) : null;
  const parsedValidTo = discount.validTo ? parseISO(discount.validTo) : null;

  const formattedValidFrom = parsedValidFrom && isValid(parsedValidFrom) ? format(parsedValidFrom, 'MMM d, yyyy') : 'N/A';
  const formattedValidTo = parsedValidTo && isValid(parsedValidTo) ? format(parsedValidTo, 'MMM d, yyyy') : 'N/A';

  const isCurrentlyActive = discount.isActive && 
                           (parsedValidFrom && isValid(parsedValidFrom) ? !isFuture(parsedValidFrom) : true) && 
                           (parsedValidTo && isValid(parsedValidTo) ? !isPast(parsedValidTo) : true);

  let validityStatusText = "";
  if (!discount.isActive) {
    validityStatusText = "Inactive";
  } else if (parsedValidFrom && isValid(parsedValidFrom) && isFuture(parsedValidFrom)) {
    validityStatusText = `Starts ${formattedValidFrom}`;
  } else if (parsedValidTo && isValid(parsedValidTo) && isPast(parsedValidTo)) {
    validityStatusText = `Expired ${formattedValidTo}`;
  } else {
    validityStatusText = "Active";
  }


  const handleCopyCode = () => {
    navigator.clipboard.writeText(discount.code)
      .then(() => {
        toast({ title: "Code Copied!", description: `${discount.code} copied to clipboard.` });
      })
      .catch(err => {
        toast({ title: "Copy Failed", description: "Could not copy code.", variant: "destructive" });
      });
  };

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      {discount.imageUrl && (
        <div className="relative w-full h-40">
          <Image
            src={discount.imageUrl}
            alt={discount.code}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            data-ai-hint={discount.aiHint || "discount offer"}
          />
        </div>
      )}
      <CardHeader className="pb-3 pt-4">
        <div className="flex justify-between items-start">
            <CardTitle className="font-headline text-2xl text-primary tracking-wider">{discount.code}</CardTitle>
            {isCurrentlyActive ? 
                <CheckCircle className="h-6 w-6 text-green-500"/> : 
                <XCircle className="h-6 w-6 text-red-500"/>
            }
        </div>
        <CardDescription className="text-xs capitalize">
            {discount.type.replace('_', ' ')} Discount
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <div className="flex items-center text-lg font-semibold text-accent">
          {discount.type === 'percentage' ? <Percent className="mr-2 h-5 w-5"/> : <Tag className="mr-2 h-5 w-5"/>}
          {discount.value}{discount.type === 'percentage' ? '%' : ` ${BASE_CURRENCY_CODE}`} Off
        </div>
        {discount.description && (
            <p className="text-sm text-foreground/80 line-clamp-2">
                {discount.description}
            </p>
        )}
        <div className="text-xs text-muted-foreground space-y-1 pt-1">
            <p className="flex items-center">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5"/>
                Validity: {formattedValidFrom} - {formattedValidTo}
            </p>
             <p className={`flex items-center font-medium ${isCurrentlyActive ? 'text-green-600' : 'text-red-600'}`}>
                <Info className="mr-1.5 h-3.5 w-3.5"/>
                Status: {validityStatusText}
            </p>
            {discount.minOrderAmount && discount.minOrderAmount > 0 && (
                <p>Min. Order: {currencySymbol}{discount.minOrderAmount.toFixed(2)} ({BASE_CURRENCY_CODE})</p>
            )}
             {discount.usageLimit > 0 && (
                <p>Usage: {discount.timesUsed} / {discount.usageLimit}</p>
            )}
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t">
        <Button variant="default" size="sm" className="w-full" onClick={handleCopyCode} disabled={!isCurrentlyActive}>
          <Copy className="mr-2 h-4 w-4" /> Copy Code
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DiscountCard;
