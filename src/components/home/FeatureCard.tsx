"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkText: string;
  imageUrl: string;
  imageAiHint: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, link, linkText, imageUrl, imageAiHint }) => (
  <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
    <div className="relative w-full h-40">
        <Image 
          src={imageUrl} 
          alt={title} 
          fill 
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover rounded-t-lg"
          data-ai-hint={imageAiHint}
        />
    </div>
    <CardHeader className="pt-4 pb-2">
      <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-2">
        {icon}
      </div>
      <CardTitle className="font-headline text-xl text-primary">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      <CardDescription className="text-foreground/70 text-sm">{description}</CardDescription>
    </CardContent>
    <CardFooter>
         <Button variant="link" asChild className="text-accent w-full">
            <Link href={link}>{linkText} &rarr;</Link>
        </Button>
    </CardFooter>
  </Card>
);
