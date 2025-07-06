"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldOff, Info, Key, Lock, Unlock, Loader2, AlertTriangle } from "lucide-react"; // Added AlertTriangle
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import CryptoJS from 'crypto-js';
import { getEncryptionStatus } from "@/app/actions/data-management-actions";
import { useAuth } from "@/context/AuthContext"; // Import useAuth


export default function EncryptionSettingsPage() {
  const { toast } = useToast();
  const { user: currentUser, isLoadingAuth } = useAuth(); // Use auth context
  const [serverEncryptionActive, setServerEncryptionActive] = useState<boolean | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  
  const [testText, setTestText] = useState<string>("Hello TableMaster!");
  const [testKey, setTestKey] = useState<string>("your-test-key");
  const [processedText, setProcessedText] = useState<string>("");

  useEffect(() => {
    async function fetchStatus() {
      if (currentUser?.role !== 'superadmin') {
        setIsLoadingStatus(false);
        setServerEncryptionActive(false); // Non-superadmins don't need to know or see this.
        return;
      }
      setIsLoadingStatus(true);
      try {
        const status = await getEncryptionStatus();
        setServerEncryptionActive(status.isActive);
      } catch (error) {
        console.error("Failed to fetch encryption status:", error);
        toast({
          title: "Error",
          description: "Could not fetch server encryption status.",
          variant: "destructive",
        });
        setServerEncryptionActive(false); // Assume inactive on error
      } finally {
        setIsLoadingStatus(false);
      }
    }
    if (!isLoadingAuth) {
       fetchStatus();
    }
  }, [toast, currentUser, isLoadingAuth]);

  const handleEncryptTest = () => {
    if (!testText || !testKey) {
      toast({ title: "Missing Input", description: "Please provide text and a key to encrypt.", variant: "destructive" });
      return;
    }
    try {
      const ciphertext = CryptoJS.AES.encrypt(testText, testKey).toString();
      setProcessedText(ciphertext);
      toast({ title: "Text Encrypted", description: "Ciphertext displayed below." });
    } catch (e) {
      toast({ title: "Encryption Error", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDecryptTest = () => {
    if (!testText || !testKey) { 
      toast({ title: "Missing Input", description: "Please provide ciphertext and a key to decrypt.", variant: "destructive" });
      return;
    }
    try {
      const bytes = CryptoJS.AES.decrypt(testText, testKey);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if (originalText) {
        setProcessedText(originalText);
        toast({ title: "Text Decrypted", description: "Original text displayed below." });
      } else {
        setProcessedText("Decryption failed or resulted in empty text (is the key correct and text valid ciphertext?).");
         toast({ title: "Decryption Issue", description: "Ensure key is correct and text is valid ciphertext.", variant: "destructive" });
      }
    } catch (e) {
      setProcessedText(`Decryption error: ${(e as Error).message}`);
      toast({ title: "Decryption Error", description: (e as Error).message, variant: "destructive" });
    }
  };
  
  if (isLoadingAuth || isLoadingStatus) {
     return (
         <div className="space-y-8">
            <Button variant="outline" asChild className="mb-4">
                <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
            </Button>
            <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading encryption settings...</p>
            </div>
        </div>
    );
  }

  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="space-y-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
        <Card className="shadow-xl border-destructive">
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-destructive flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">You do not have permission to view Encryption Settings.</p>
            <p className="text-muted-foreground">This section is reserved for Super Administrators only.</p>
             <Button asChild variant="link" className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <Lock className="mr-3 h-7 w-7" /> CSV Data Encryption Settings
        </h1>
        <p className="text-muted-foreground">Manage and understand encryption for your CSV data files.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            {isLoadingStatus ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 
             serverEncryptionActive ? <ShieldCheck className="mr-2 h-5 w-5 text-green-600"/> : <ShieldOff className="mr-2 h-5 w-5 text-red-600"/>}
            Server-Side Encryption Status
          </CardTitle>
          <CardDescription>
            This status reflects whether CSV files are being actively decrypted/encrypted by the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStatus ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading status...</span>
            </div>
          ) : serverEncryptionActive ? (
            <Alert variant="default" className="bg-green-50 border-green-300">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-700 font-semibold">Encryption is Active</AlertTitle>
              <AlertDescription className="text-green-600">
                The server has an `ENCRYPTION_KEY` set in its environment variables.
                CSV files will be attempted to be decrypted upon reading. Uploaded files would be encrypted if saving functionality is implemented with encryption.
              </AlertDescription>
            </Alert>
          ) : (
             <Alert variant="destructive">
              <ShieldOff className="h-5 w-5" />
              <AlertTitle className="font-semibold">Encryption is Inactive</AlertTitle>
              <AlertDescription>
                The server does not have an `ENCRYPTION_KEY` set in its environment variables.
                CSV files are being read and will be saved (if implemented) as plaintext.
              </AlertDescription>
            </Alert>
          )}
          <Alert className="mt-6">
            <Info className="h-5 w-5" />
            <AlertTitle className="font-semibold">How to Configure Server-Side Encryption</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Set the `ENCRYPTION_KEY` environment variable in your project's `.env` file (create one at the project root if it doesn't exist).</li>
                <li>The key should be a strong, unique, and secret passphrase (e.g., at least 32 random characters).</li>
                <li>Example: `ENCRYPTION_KEY="your_very_long_and_super_secret_encryption_key_here"`</li>
                <li>Restart your server application for the changes to take effect.</li>
                <li><strong>Important:</strong> Keep this key secure. If you lose it, you won't be able to decrypt your data. Do NOT commit your `.env` file to version control.</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Key className="mr-2 h-5 w-5 text-accent"/>Client-Side Encryption/Decryption Utility</CardTitle>
          <CardDescription>Test AES encryption/decryption locally in your browser. This does not affect server files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="testText">Text to Encrypt/Decrypt</Label>
                <Textarea id="testText" value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="Enter text or ciphertext"/>
            </div>
            <div>
                <Label htmlFor="testKey">Test Encryption Key</Label>
                <Input id="testKey" value={testKey} onChange={(e) => setTestKey(e.target.value)} placeholder="Enter a test key"/>
            </div>
            <div className="flex space-x-2">
                <Button onClick={handleEncryptTest}><Lock className="mr-2 h-4 w-4"/> Encrypt</Button>
                <Button onClick={handleDecryptTest} variant="outline"><Unlock className="mr-2 h-4 w-4"/> Decrypt</Button>
            </div>
            {processedText && (
                <div>
                    <Label>Result:</Label>
                    <Textarea readOnly value={processedText} rows={5} className="font-mono text-xs bg-muted/50"/>
                </div>
            )}
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                This tool uses AES encryption from `crypto-js` for demonstration. Ensure your server's `ENCRYPTION_KEY` matches if you are preparing files for server-side encryption.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
