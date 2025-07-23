// src/components/admin/tools/IdCardGeneratorClient.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, UserSquare, UploadCloud, Link as LinkIcon, Eye, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import EmployeeIdCardPreview, { type EmployeeIdCardData } from '@/components/admin/EmployeeIdCardPreview';
import { useToast } from "@/hooks/use-toast";
import NextImage from 'next/image';
import type { InvoiceSetupSettings } from '@/lib/types';

const idCardFormSchema = z.object({
  employeeName: z.string().min(1, "Employee name is required."),
  designation: z.string().min(1, "Designation is required."),
  department: z.string().optional(),
  employeePhotoFile: z.custom<File | undefined>((val) => val === undefined || val instanceof File, "Invalid file").optional(),
  employeePhotoUrl: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
  companyLogoUrl: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
  expiryDate: z.date().optional().nullable(),
  authorizedSignatoryName: z.string().min(1, "Signatory name is required."),
  signatoryImageUrl: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
  bloodType: z.string().optional(),
  nationalId: z.string().optional(),
}).refine(data => data.employeePhotoFile || data.employeePhotoUrl || true, { 
  // Photo is optional overall, no specific message path needed
});

type IdCardFormValues = z.infer<typeof idCardFormSchema>;

interface IdCardGeneratorClientProps {
    initialSettings: InvoiceSetupSettings;
}

export const IdCardGeneratorClient: React.FC<IdCardGeneratorClientProps> = ({ initialSettings }) => {
  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<EmployeeIdCardData | null>(null);
  const [employeePhotoPreview, setEmployeePhotoPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<IdCardFormValues>({
    resolver: zodResolver(idCardFormSchema),
    defaultValues: {
      employeeName: "",
      designation: "",
      department: "",
      authorizedSignatoryName: initialSettings.idCardDefaultSignatory || "Authorized Signatory", 
      employeePhotoFile: undefined,
      employeePhotoUrl: "",
      companyLogoUrl: initialSettings.companyLogoUrl || "", 
      signatoryImageUrl: "https://placehold.co/150x50.png?text=Sign",
      expiryDate: null,
      bloodType: "",
      nationalId: "",
    },
  });

  const handleEmployeePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "File too large", description: "Employee photo should be less than 2MB.", variant: "destructive" });
        form.setValue("employeePhotoFile", undefined);
        if(fileInputRef.current) fileInputRef.current.value = ""; 
        setEmployeePhotoPreview(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmployeePhotoPreview(reader.result as string);
        form.setValue("employeePhotoUrl", ""); 
        form.setValue("employeePhotoFile", file);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("employeePhotoFile", undefined);
      setEmployeePhotoPreview(null);
    }
  };
  
  const handleEmployeePhotoUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    form.setValue("employeePhotoUrl", url);
    if (url) {
      setEmployeePhotoPreview(url); 
      form.setValue("employeePhotoFile", undefined); 
      if(fileInputRef.current) fileInputRef.current.value = "";
    } else if (!form.getValues("employeePhotoFile")) {
        setEmployeePhotoPreview(null); 
    }
  };

  const onSubmit = (values: IdCardFormValues) => {
    const dataForPreview: EmployeeIdCardData = {
      ...values,
      employeePhotoUrl: employeePhotoPreview || values.employeePhotoUrl || null, 
      companyName: initialSettings.companyName,
      companyAddress: initialSettings.idCardAddressLine || initialSettings.companyAddress,
      idCardReturnInstructions: initialSettings.idCardReturnInstructions,
      idCardPropertyOfLine: initialSettings.idCardPropertyOfLine,
    };
    setPreviewData(dataForPreview);
    toast({ title: "ID Card Preview Generated", description: "Review the preview below." });
  };

  const handlePrint = () => {
    const printContents = document.getElementById("id-card-preview-area")?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '_blank', 'height=700,width=900');
      printWindow?.document.write('<html><head><title>Print ID Card</title>');
      const stylesheets = Array.from(document.styleSheets)
        .map(sheet => {
            try { return sheet.href ? `<link rel="stylesheet" href="${sheet.href}">` : ''; }
            catch (e) { return '';}
        }).filter(Boolean).join('');
      printWindow?.document.write(stylesheets);
      printWindow?.document.write(`
        <style> 
          @media print { 
            body { margin: 0; padding: 10mm; display: flex; justify-content: center; align-items: center; height: 100vh; } 
            .id-card-print-wrapper { display: flex; gap: 20px; align-items: flex-start; }
            .id-card-preview-container { 
              border: 1px dashed #ccc !important; 
              page-break-inside: avoid;
              width: 323px !important; 
              height: 203px !important; 
              overflow: hidden; 
            }
            .no-print { display: none !important; }
          } 
        </style>`);
      printWindow?.document.write('</head><body><div class="id-card-print-wrapper">');
      printWindow?.document.write(printContents);
      printWindow?.document.write('</div></body></html>');
      printWindow?.document.close();
      printWindow?.focus();
      setTimeout(() => { printWindow?.print(); }, 500); 
    } else {
        toast({title: "Error Printing", description: "Preview content not found.", variant: "destructive"});
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <UserSquare className="mr-3 h-7 w-7" /> Employee ID Card Generator
        </h1>
        <p className="text-muted-foreground">Fill in the employee details to generate a printable ID card. Default company info from General Settings.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Employee Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="employeeName" render={({ field }) => (
                  <FormItem><FormLabel>Employee Name *</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="designation" render={({ field }) => (
                  <FormItem><FormLabel>Designation *</FormLabel><FormControl><Input placeholder="e.g., Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem><FormLabel>Department (Optional)</FormLabel><FormControl><Input placeholder="e.g., Technology" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              
              <FormItem>
                <FormLabel>Employee Photo</FormLabel>
                <FormControl>
                    <Input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp, image/avif" 
                        onChange={handleEmployeePhotoFileChange}
                        ref={fileInputRef}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                </FormControl>
                 <FormDescription className="text-xs">Max 2MB. PNG, JPG, WEBP, AVIF accepted.</FormDescription>
                <p className="text-sm text-muted-foreground my-1">Or</p>
                <FormField control={form.control} name="employeePhotoUrl" render={({ field }) => (
                    <FormItem className="mt-0 pt-0">
                        <FormLabel className="sr-only">Employee Photo URL</FormLabel>
                        <div className="flex items-center gap-2">
                             <LinkIcon className="h-4 w-4 text-muted-foreground"/>
                             <FormControl><Input type="url" placeholder="https://example.com/photo.jpg" {...field} onChange={handleEmployeePhotoUrlChange} /></FormControl>
                        </div>
                        <FormDescription className="text-xs">Provide a direct URL to an image if not uploading a file.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}/>
                {employeePhotoPreview && (
                    <div className="mt-2 w-24 h-32 border rounded-md overflow-hidden">
                        <NextImage src={employeePhotoPreview} alt="Photo Preview" width={96} height={128} className="object-cover w-full h-full" />
                    </div>
                )}
              </FormItem>

            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader><CardTitle>Company & Card Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <FormField control={form.control} name="companyLogoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Logo URL (Overrides default)</FormLabel>
                   <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground"/>
                        <FormControl><Input type="url" placeholder="Leave blank to use default from General Settings" {...field} /></FormControl>
                   </div>
                  <FormDescription>Provide a direct URL to your company logo if you want to override the default.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="expiryDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Expiry Date (Optional)</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl>
                      <Button variant="outline" className={cn("w-full md:w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "dd-MM-yyyy") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )}/>
            </CardContent>
          </Card>
          
          <Card className="shadow-xl">
            <CardHeader><CardTitle>Additional Information (Optional)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="authorizedSignatoryName" render={({ field }) => (
                    <FormItem><FormLabel>Authorized Signatory Name *</FormLabel><FormControl><Input placeholder="Defaults to setting" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="signatoryImageUrl" render={({ field }) => (
                <FormItem>
                    <FormLabel>Signatory Image URL (Optional)</FormLabel>
                     <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground"/>
                        <FormControl><Input type="url" placeholder="https://placehold.co/150x50.png?text=Sign" {...field} /></FormControl>
                    </div>
                    <FormDescription>URL for the signatory's image/signature.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}/>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="bloodType" render={({ field }) => (
                  <FormItem><FormLabel>Blood Type</FormLabel><FormControl><Input placeholder="e.g., O+" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="nationalId" render={({ field }) => (
                  <FormItem><FormLabel>Aadhar / National ID</FormLabel><FormControl><Input placeholder="e.g., 1234 5678 9012" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button type="submit" size="lg" className="flex-grow">
              <Eye className="mr-2 h-5 w-5" /> Generate & Preview ID Card
            </Button>
             {previewData && (
                <Button type="button" onClick={handlePrint} size="lg" variant="outline" className="flex-grow">
                    <FileText className="mr-2 h-5 w-5" /> Print ID Card
                </Button>
            )}
          </div>
        </form>
      </Form>

      <div id="id-card-preview-area">
         <EmployeeIdCardPreview data={previewData} />
      </div>
    </div>
  );
}
