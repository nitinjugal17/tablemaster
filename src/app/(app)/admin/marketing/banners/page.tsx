
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import NextImage from 'next/image';
import { ArrowLeft, GalleryHorizontal, PlusCircle, Edit3, Trash2, Loader2, Save, MoreVertical, PackageSearch, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter as DialogFooterComponent,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader as AlertDialogHeaderComponentShad,
  AlertDialogFooter as AlertDialogFooterComponentShad,
  AlertDialogTitle as AlertDialogTitleComponentShad,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as TableHeaderComponentShad,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, useMemo } from "react";
import type { Banner } from "@/lib/types";
import { getBanners, saveBanners as saveBannersAction } from "@/app/actions/data-management-actions";
import { BannerEditor } from "@/components/admin/marketing/BannerEditor"; 
import { format, parseISO, isValid } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function BannerManagementPage() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const existingBannerTitles = useMemo(() => banners.map(b => b.title), [banners]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const fetchedBanners = await getBanners();
        setBanners(fetchedBanners.sort((a,b) => a.displayOrder - b.displayOrder));
      } catch (error) {
        toast({ title: "Error", description: "Could not load banners.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleSaveBanner = (data: Banner) => {
    setBanners(prev => {
      const existingIndex = prev.findIndex(b => b.id === data.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated.sort((a,b) => a.displayOrder - b.displayOrder);
      }
      return [...prev, data].sort((a,b) => a.displayOrder - b.displayOrder);
    });
    toast({ title: "Banner Saved Locally", description: `Banner "${data.title}" ${data.id === editingBanner?.id ? 'updated' : 'added'}. Save all to persist.` });
    setIsEditorOpen(false);
    setEditingBanner(undefined);
  };

  const handleOpenEditor = (banner?: Banner) => {
    setEditingBanner(banner);
    setIsEditorOpen(true);
  };

  const handleDeleteBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
    toast({ title: "Banner Deleted Locally", description: "Save all changes to persist this deletion.", variant: "destructive" });
  };

  const handleSaveAllToCsv = async () => {
    setIsSaving(true);
    try {
      const result = await saveBannersAction(banners);
      if (result.success) {
        toast({ title: "Banners Saved", description: "All banner changes have been saved to CSV." });
      } else {
        toast({ title: "Error Saving Banners", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save banners.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getValidityString = (from?: string, to?: string): string => {
    const fromDate = from && isValid(parseISO(from)) ? format(parseISO(from), 'MMM d, yy') : null;
    const toDate = to && isValid(parseISO(to)) ? format(parseISO(to), 'MMM d, yy') : null;

    if (fromDate && toDate) return `${fromDate} - ${toDate}`;
    if (fromDate) return `From ${fromDate}`;
    if (toDate) return `Until ${toDate}`;
    return "Always Active";
  };

  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setEditingBanner(undefined);}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {editingBanner?.id ? `Edit Banner: ${editingBanner.title}` : "Create New Banner"}
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && (
            <BannerEditor
              banner={editingBanner}
              onSave={handleSaveBanner}
              onClose={() => setIsEditorOpen(false)}
              existingBannerTitles={editingBanner?.id ? existingBannerTitles.filter(t => t.toLowerCase() !== editingBanner.title?.toLowerCase()) : existingBannerTitles}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button variant="outline" asChild className="mb-4">
            <Link href="/admin/marketing"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketing</Link>
          </Button>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <GalleryHorizontal className="mr-3 h-7 w-7" /> Banner Management
          </h1>
          <p className="text-muted-foreground">Create, edit, and manage promotional banners. Saved to `banners.csv`.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => handleOpenEditor()} className="flex-grow sm:flex-grow-0">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Banner
          </Button>
          <Button onClick={handleSaveAllToCsv} disabled={isSaving || isLoading} className="flex-grow sm:flex-grow-0">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All to CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">Current Banners ({banners.length})</CardTitle>
          <CardDescription>Changes are local until "Save All to CSV" is clicked. Lower display order appears first.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading banners...</span></div>
          ) : banners.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <Table>
                <TableHeaderComponentShad>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeaderComponentShad>
                <TableBody>
                  {banners.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <NextImage src={b.imageUrl} alt={b.title} width={100} height={50} className="rounded-md object-cover aspect-video" data-ai-hint={b.aiHint || b.title.toLowerCase().split(' ').slice(0,2).join(' ')} />
                      </TableCell>
                      <TableCell className="font-semibold text-primary">{b.title}</TableCell>
                      <TableCell>{b.displayOrder}</TableCell>
                      <TableCell>
                        {b.isActive ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                      </TableCell>
                      <TableCell className="text-xs">{getValidityString(b.validFrom, b.validTo)}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => handleOpenEditor(b)} className="mr-1">
                           <Edit3 className="h-4 w-4"/> <span className="sr-only">Edit</span>
                         </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4"/> <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeaderComponentShad><AlertDialogTitleComponentShad>Delete Banner "{b.title}"?</AlertDialogTitleComponentShad>
                              <AlertDialogDescription>This will mark the banner for deletion. Save all changes to CSV to make it permanent.</AlertDialogDescription>
                            </AlertDialogHeaderComponentShad>
                            <AlertDialogFooterComponentShad><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBanner(b.id)}>Delete Locally</AlertDialogAction></AlertDialogFooterComponentShad>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-16">
              <PackageSearch className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Banners Configured</h2>
              <p className="text-muted-foreground">Click "Add New Banner" to create your first promotional banner.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
