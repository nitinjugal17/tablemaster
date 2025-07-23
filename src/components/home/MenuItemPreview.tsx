
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

interface MenuItemPreviewProps {
  name: string;
  description: string;
  imageUrl: string;
  aiHint?: string;
}

export const MenuItemPreview: React.FC<MenuItemPreviewProps> = ({ name, description, imageUrl, aiHint }) => (
  <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
    <div className="relative w-full h-48">
      <Image 
        src={imageUrl} 
        alt={name} 
        fill 
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover" 
        data-ai-hint={aiHint} 
      />
    </div>
    <CardContent className="p-6">
      <h3 className="font-headline text-xl font-semibold text-primary mb-2">{name}</h3>
      <p className="text-sm text-foreground/70">{description}</p>
    </CardContent>
  </Card>
);
