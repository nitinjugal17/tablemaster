"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Feedback, FeedbackCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from "@/lib/utils";

interface FeedbackReportClientProps {
  initialFeedback: Feedback[];
  initialCategories: FeedbackCategory[];
}

export const FeedbackReportClient: React.FC<FeedbackReportClientProps> = ({ initialFeedback, initialCategories }) => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>(initialFeedback);
  const [categories, setCategories] = useState<FeedbackCategory[]>(initialCategories);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  
  const uniqueCategories = useMemo(() => ['all', ...categories.map(c => c.name)], [categories]);
  const ratings = ['all', '1', '2', '3', '4', '5'];

  const filteredFeedback = useMemo(() => {
    return feedback.filter(f => {
        const matchesSearch = searchTerm === "" || 
            f.comments.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (f.customerName && f.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (f.contactInfo && f.contactInfo.toLowerCase().includes(searchTerm.toLowerCase()));
            
        const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
        const matchesRating = ratingFilter === 'all' || f.rating.toString() === ratingFilter;

        return matchesSearch && matchesCategory && matchesRating;
    });
  }, [feedback, searchTerm, categoryFilter, ratingFilter]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={cn("h-4 w-4", i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300')} />
        ))}
      </div>
    );
  };


  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <MessageSquare className="mr-3 h-7 w-7" /> Customer Feedback Report
        </h1>
        <p className="text-muted-foreground">Review and analyze all feedback submitted by customers.</p>
      </div>
      
       <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline">Feedback Entries ({feedback.length})</CardTitle>
                <CardDescription>Filter feedback by rating, category, or search term.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <Input
                    placeholder="Search comments, name, contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:w-52"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueCategories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger className="w-full sm:w-[130px]">
                        <SelectValue placeholder="Filter by rating" />
                    </SelectTrigger>
                    <SelectContent>
                        {ratings.map(r => <SelectItem key={r} value={r}>{r === 'all' ? 'All Ratings' : `${r} Star(s)`}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
          {filteredFeedback.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedback.map((fb) => (
                    <TableRow key={fb.id}>
                      <TableCell className="text-xs">{format(parseISO(fb.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{renderStars(fb.rating)}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{fb.category}</Badge></TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <p className="text-sm">{fb.comments}</p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs whitespace-pre-wrap">
                                    {fb.comments}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-xs">
                        {fb.customerName || 'Anonymous'}
                        <p className="text-muted-foreground">{fb.contactInfo}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                            {fb.source?.replace('_', ' ') || 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-10">
              {searchTerm || categoryFilter !== 'all' || ratingFilter !== 'all' ? "No feedback matches your current filters." : "No feedback has been submitted yet."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
