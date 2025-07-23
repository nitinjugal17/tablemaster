import Logo from "@/components/layout/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} TableMaster. All rights reserved.
      </p>
    </div>
  );
}
