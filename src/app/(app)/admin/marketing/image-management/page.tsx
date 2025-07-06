
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Image as ImageIconLucide, PlusCircle, Edit3, Trash2, Loader2, MoreVertical, Save, PackageSearch, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader as AlertDialogHeaderComponent,
  AlertDialogFooter as AlertDialogFooterComponent,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as TableHeaderComponent,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, useMemo } from "react";
import type { ManagedImage, ManagedImageContext } from "@/lib/types";
import { ALL_MANAGED_IMAGE_CONTEXTS } from "@/lib/types";
import { getManagedImages, saveManagedImages as saveImagesAction } from "@/app/actions/data-management-actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from '@/components/ui/scroll-area';
import NextImage from 'next/image'; // For displaying images
import { format, parseISO } from 'date-fns';

const imageRecordSchema = z.object({
  id: z.string().optional(),
  context: z.enum(ALL_MANAGED_IMAGE_CONTEXTS as [ManagedImageContext, ...ManagedImageContext[]], { required_error: "Image context is required." }),
  entityId: z.string().optional(),
  imageUrl: z.string().url({ message: "Valid image URL is required." }).min(1, "Image URL cannot be empty."),
  aiPromptUsed: z.string().optional(),
  aiHint: z.string().optional(),
  altText: z.string().optional(),
});

type ImageRecordFormValues = z.infer<typeof imageRecordSchema>;

interface ImageRecordEditorProps {
  imageRecord?: Partial<ManagedImage>;
  onSave: (data: ManagedImage) => void;
  onClose: () => void;
}

const ImageRecordEditor: React.FC<ImageRecordEditorProps> = ({ imageRecord, onSave, onClose }) => {
  const form = useForm<ImageRecordFormValues>({
    resolver: zodResolver(imageRecordSchema),
    defaultValues: {
      id: imageRecord?.id || "",
      context: imageRecord?.context || ALL_MANAGED_IMAGE_CONTEXTS[0],
      entityId: imageRecord?.entityId || "",
      imageUrl: imageRecord?.imageUrl || "",
      aiPromptUsed: imageRecord?.aiPromptUsed || "",
      aiHint: imageRecord?.aiHint || "",
      altText: imageRecord?.altText || "",
    },
  });

  function onSubmit(data: ImageRecordFormValues) {
    const finalData: ManagedImage = {
      id: data.id || crypto.randomUUID(),
      context: data.context,
      entityId: data.entityId || undefined,
      imageUrl: data.imageUrl,
      aiPromptUsed: data.aiPromptUsed || undefined,
      aiHint: data.aiHint || undefined,
      altText: data.altText || undefined,
      uploadedAt: imageRecord?.uploadedAt || new Date().toISOString(), // Preserve original or set new
    };
    onSave(finalData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField control={form.control} name="imageUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>Image URL *</FormLabel>
            <FormControl><Input type="url" placeholder="https://example.com/image.png" {...field} /></FormControl>
            <FormDescription>Direct URL to the image (e.g., from cloud storage).</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        {form.watch("imageUrl") && (
            <div className="my-2">
                <Label>Current Image Preview:</Label>
                <div className="mt-1 w-full h-40 relative border rounded-md overflow-hidden bg-muted/30">
                    <NextImage src={form.watch("imageUrl")} alt="Image Preview" fill className="object-contain" />
                </div>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="context" render={({ field }) => (
            <FormItem>
              <FormLabel>Context *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select context" /></SelectTrigger></FormControl>
                <SelectContent>
                  {ALL_MANAGED_IMAGE_CONTEXTS.map(ctx => <SelectItem key={ctx} value={ctx} className="capitalize">{ctx.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormDescription>Where this image is used.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="entityId" render={({ field }) => (
            <FormItem>
              <FormLabel>Associated Entity ID (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., menu-item-id, offer-id" {...field} /></FormControl>
              <FormDescription>ID of the item this image relates to.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="altText" render={({ field }) => (
          <FormItem>
            <FormLabel>Alt Text (Optional)</FormLabel>
            <FormControl><Input placeholder="Descriptive text for accessibility" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="aiHint" render={({ field }) => (
          <FormItem>
            <FormLabel>AI Hint / Keywords (Optional)</FormLabel>
            <FormControl><Input placeholder="e.g., spicy chicken dish, summer sale banner" {...field} /></FormControl>
            <FormDescription>Keywords for future AI generation or search. Max 2 words.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="aiPromptUsed" render={({ field }) => (
          <FormItem>
            <FormLabel>AI Prompt Used (If Applicable)</FormLabel>
            <FormControl><Textarea placeholder="Prompt used to generate this image if AI was used." {...field} rows={2} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="pt-2">
            <Button type="button" variant="outline" className="w-full" disabled>
                <Wand2 className="mr-2 h-4 w-4"/> Generate Image with AI (Conceptual)
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-1">AI image generation via Genkit to be implemented.</p>
        </div>
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{imageRecord?.id ? "Save Changes" : "Add Image Record"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default function ImageManagementPage() {
  const { toast } = useToast();
  const [images, setImages] = useState<ManagedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Partial<ManagedImage> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const fetchedImages = await getManagedImages();
        setImages(fetchedImages.sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
      } catch (error) {
        toast({ title: "Error", description: "Could not load image records.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleSaveRecord = (data: ManagedImage) => {
    setImages(prev => {
      const existingIndex = prev.findIndex(img => img.id === data.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated.sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      }
      return [...prev, data].sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    });
    toast({ title: "Image Record Saved Locally", description: `Record for "${data.imageUrl.substring(0,30)}..." ${data.id === editingRecord?.id ? 'updated' : 'added'}. Save all to persist.` });
    setIsEditorOpen(false);
    setEditingRecord(undefined);
  };

  const handleOpenEditor = (record?: ManagedImage) => {
    setEditingRecord(record);
    setIsEditorOpen(true);
  };

  const handleDeleteRecord = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    toast({ title: "Image Record Deleted Locally", description: "Save all changes to persist this deletion.", variant: "destructive" });
  };

  const handleSaveAllToCsv = async () => {
    setIsSaving(true);
    try {
      const result = await saveImagesAction(images);
      if (result.success) {
        toast({ title: "Image Records Saved", description: "All image records have been saved to CSV." });
      } else {
        toast({ title: "Error Saving Records", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save image records.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setEditingRecord(undefined);}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {editingRecord?.id ? `Edit Image Record` : "Add New Image Record"}
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && (
            <ImageRecordEditor
              imageRecord={editingRecord}
              onSave={handleSaveRecord}
              onClose={() => setIsEditorOpen(false)}
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
            <ImageIconLucide className="mr-3 h-7 w-7" /> Image Management
          </h1>
          <p className="text-muted-foreground">Manage image URLs and their metadata. Images must be hosted externally. Data saved to `managed-images.csv`.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => handleOpenEditor()} className="flex-grow sm:flex-grow-0">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Image Record
          </Button>
          <Button onClick={handleSaveAllToCsv} disabled={isSaving || isLoading} className="flex-grow sm:flex-grow-0">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All to CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">Managed Image Records ({images.length})</CardTitle>
          <CardDescription>Changes are local until "Save All to CSV" is clicked.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading image records...</span></div>
          ) : images.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <Table>
                <TableHeaderComponent>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Image URL</TableHead>
                    <TableHead>Alt Text</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeaderComponent>
                <TableBody>
                  {images.map((img) => (
                    <TableRow key={img.id}>
                      <TableCell>
                        <NextImage src={img.imageUrl} alt={img.altText || img.context} width={40} height={40} className="rounded-sm object-cover aspect-square" data-ai-hint={img.aiHint || img.altText?.toLowerCase() || 'image'} />
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{img.context.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]" title={img.imageUrl}>{img.imageUrl}</TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]" title={img.altText}>{img.altText || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{format(parseISO(img.uploadedAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditor(img)}>
                          <Edit3 className="h-4 w-4"/>
                          <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4"/>
                                <span className="sr-only">Delete</span>
                             </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeaderComponent><AlertDialogTitleComponent>Delete Image Record?</AlertDialogTitleComponent>
                              <AlertDialogDescription>
                                This will mark the record for this image URL for deletion. Save all to CSV to make it permanent. This does not delete the image from its host.
                              </AlertDialogDescription>
                            </AlertDialogHeaderComponent>
                            <AlertDialogFooterComponent><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteRecord(img.id)}>Delete Locally</AlertDialogAction></AlertDialogFooterComponent>
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
              <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Image Records Found</h2>
              <p className="text-muted-foreground">Add records of your images to manage them centrally.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
