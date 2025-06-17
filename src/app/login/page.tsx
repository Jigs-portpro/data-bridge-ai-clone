"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoIcon } from '@/components/icons/LogoIcon';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <LogoIcon className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Data Bridge</CardTitle>
          <CardDescription>Sign in with your @portpro.io Google account to access your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            className="w-full"
            onClick={() => signIn("google")}
          >
            Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground">
          <p>Only @portpro.io Google accounts are allowed.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
