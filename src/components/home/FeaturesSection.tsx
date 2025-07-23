
"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FeatureCard } from './FeatureCard';
import { UtensilsCrossed } from 'lucide-react';

interface FeaturesSectionProps {
  isLoadingCategories: boolean;
  uniqueCategories: string[];
  categoryImagesMap: Record<string, string>;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ 
  isLoadingCategories, 
  uniqueCategories, 
  categoryImagesMap 
}) => {
  return (
    <section id="features" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-center text-primary mb-6">
          Explore Our Menu by Category
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto text-center">
          Dive into our diverse range of culinary delights, organized by category for your convenience.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {isLoadingCategories ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-lg" />)
          ) : uniqueCategories.length > 0 ? (
            uniqueCategories.map(category => {
              const imageUrl = categoryImagesMap[category] || `https://placehold.co/800x600.png?text=${encodeURIComponent(category)}`;
              return (
                <FeatureCard
                  key={category}
                  icon={<UtensilsCrossed className="h-12 w-12 text-accent" />}
                  title={category}
                  description={`Explore our delicious ${category.toLowerCase()} dishes, crafted with the freshest ingredients.`}
                  link={`/menu?category=${encodeURIComponent(category)}`}
                  linkText={`View ${category}`}
                  imageUrl={imageUrl}
                  imageAiHint={category.toLowerCase().split(' ').slice(0, 2).join(' ')}
                />
              );
            })
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">No menu categories found to display at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
