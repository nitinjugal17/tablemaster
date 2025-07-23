
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import NextImage from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, PlusCircle, Edit3, Trash2, Loader2, Save, MoreVertical, PackageSearch, CheckCircle, XCircle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle, 
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Offer } from "@/lib/types";
import { getOffers, saveOffers as saveOffersAction } from "@/app/actions/data-management-actions";
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, isValid } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OfferEditorForm } from './OfferEditorForm';

interface MarketingOfferEditorProps {
    initialOffers: Offer[];
}

export const MarketingOfferEditor: React.FC<MarketingOfferEditorProps> = ({ initialOffers }) => {
  const { toast } = useToast();
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Partial<Offer> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    setOffers(initialOffers);
  }, [initialOffers]);

  const existingOfferTitles = useMemo(() => offers.map(o => o.title), [offers]);

  const handleSaveOffer = (data: Offer) => {
    setOffers(prev => {
      const existingIndex = prev.findIndex(o => o.id === data.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated.sort((a,b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime());
      }
      return [...prev, data].sort((a,b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime());
    });
    toast({ title: "Offer Saved Locally", description: `Offer "${data.title}" ${data.id === editingOffer?.id ? 'updated' : 'added'}. Save all to persist.` });
    setIsEditorOpen(false);
    setEditingOffer(undefined);
  };

  const handleOpenEditor = (offer?: Offer) => {
    setEditingOffer(offer);
    setIsEditorOpen(true);
  };

  const handleDeleteOffer = (id: string) => {
    setOffers(prev => prev.filter(o => o.id !== id));
    toast({ title: "Offer Deleted Locally", description: "Save all changes to persist this deletion.", variant: "destructive" });
  };

  const handleSaveAllToCsv = async () => {
    setIsSaving(true);
    try {
      const result = await saveOffersAction(offers);
      if (result.success) {
        toast({ title: "Offers Saved", description: "All offer changes have been saved to CSV." });
      } else {
        toast({ title: "Error Saving Offers", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save offers.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getValidityString = (from: string, to: string): string => {
    try {
      const fromDate = isValid(parseISO(from)) ? format(parseISO(from), 'MMM d, yy') : 'Invalid';
      const toDate = isValid(parseISO(to)) ? format(parseISO(to), 'MMM d, yy') : 'Invalid';
      return `${fromDate} - ${toDate}`;
    } catch { return "Invalid Dates"; }
  };

  return (
    <div className="space-y-8">
       <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setEditingOffer(undefined);}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {editingOffer?.id ? `Edit Offer: ${editingOffer.title}` : "Create New Offer"}
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && (
            <OfferEditorForm
              offer={editingOffer}
              onSave={handleSaveOffer}
              onClose={() => setIsEditorOpen(false)}
              existingOfferTitles={editingOffer?.id ? existingOfferTitles.filter(t => t.toLowerCase() !== editingOffer.title?.toLowerCase()) : existingOfferTitles}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <Gift className="mr-3 h-7 w-7" /> Offers & Promotions Management
            </h1>
            <p className="text-muted-foreground">Create and manage special offers. Saved to data source.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => handleOpenEditor()} className="flex-grow sm:flex-grow-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Offer
            </Button>
            <Button onClick={handleSaveAllToCsv} disabled={isSaving || isLoading} className="flex-grow sm:flex-grow-0">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save All Changes
            </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">Current Offers ({offers.length})</CardTitle>
          <CardDescription>Changes are local until "Save All Changes" is clicked.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading offers...</span></div>
          ) : offers.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)]">
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {offers.map((o) => (
                    <TableRow key={o.id}>
                        <TableCell className="font-semibold text-primary flex items-center gap-2">
                            {o.imageUrl ? <NextImage src={o.imageUrl} alt={o.title} width={32} height={32} className="rounded-sm object-cover aspect-square" data-ai-hint={o.aiHint || o.title.toLowerCase()} /> : <Gift className="h-5 w-5 text-muted-foreground"/>}
                            <div>
                                {o.title}
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{o.description}</p>
                            </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{o.type.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="text-xs">{getValidityString(o.validFrom, o.validTo)}</TableCell>
                        <TableCell>
                        {o.isActive ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                        </TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditor(o)}><Edit3 className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Offer "{o.title}"?</AlertDialogTitle>
                                    <AlertDialogDescription>This will mark the offer for deletion. Save all changes to persist.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteOffer(o.id)}>Delete Locally</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { try { alert(JSON.stringify(JSON.parse(o.details || "{}"), null, 2)) } catch { alert("Invalid or empty JSON in details.") } }}><FileText className="mr-2 h-4 w-4"/> View Details JSON</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-16">
                <PackageSearch className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Offers Yet</h2>
                <p className="text-muted-foreground">No offers or promotions have been created. Click "Add New Offer" to start.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
