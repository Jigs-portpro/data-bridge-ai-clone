"use client";

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/hooks/useAppContext';
import { KeyRound, Loader2, Trash2, Eye, Building } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { API_RESPONSE_STORAGE_KEY } from '@/lib/constants';

export default function AuthTokenPage() {
  const {
    showToast,
    isLoading: appIsLoading,
    setIsLoading: setAppIsLoading,
    isAuthenticated,
    isAuthLoading,
    storeApiToken,
    clearApiToken,
    getApiToken,
    storeCarrierId,
    getCarrierId,
    clearCarrierId,
    currentCompanyName,
    fetchActiveBaseUrl,
  } = useAppContext();
  
  // Get current user's email from stored API response in localStorage
  const getStoredApiResponseEmail = (): string | null => {
    if (typeof window !== 'undefined') {
      try {
        const storedResponse = localStorage.getItem(API_RESPONSE_STORAGE_KEY);
        if (storedResponse) {
          const parsedResponse = JSON.parse(storedResponse);
          return parsedResponse?.data?.user?.email || null;
        }
      } catch (error) {
        console.error('Error parsing stored API response:', error);
      }
    }
    return null;
  };
  
  const currentUserEmail = getStoredApiResponseEmail();
  
  const [email, setEmail] = useState(currentUserEmail || 'jthurston@centraltransport.com');
  const [password, setPassword] = useState('');
  const [storedTokenValue, setStoredTokenValue] = useState<string | null>(null);
  const [fullApiResponse, setFullApiResponse] = useState<any | null>(null);
  const [isFetchingToken, setIsFetchingToken] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setStoredTokenValue(getApiToken());
    }
  }, [getApiToken, currentCompanyName]); // currentCompanyName dependency is fine, re-check token if company changes contextually

  // Update email when stored API response changes
  useEffect(() => {
    const storedEmail = getStoredApiResponseEmail();
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, [storedTokenValue]); // Re-check when token changes as it indicates API response was updated

  // Update email on component mount
  useEffect(() => {
    const storedEmail = getStoredApiResponseEmail();
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []); // Run only on mount

  const extractCompanyName = (response: any): string | null => {
    if (!response) return null;
    return response.data?.user?.company_name || 
           response.data?.company?.name || 
           response.data?.name || 
           response.company_name || 
           response.name || 
           null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (storedTokenValue) { // Prevent submission if token is already active
        showToast({ title: 'Token Active', description: 'Please clear the current token before obtaining a new one.', variant: 'destructive'});
        return;
    }
    setIsFetchingToken(true);
    setAppIsLoading(true);
    setFullApiResponse(null);
    try {
      // Use the cached or database active base URL
      const baseUrl = await fetchActiveBaseUrl();
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
        },
        body: JSON.stringify({
          email,
          password,
          role: 'carrier',
          deviceType: 'WEB',
          flushPreviousSessions: true,
        }),
      });

      const responseData = await response.json();
      setFullApiResponse(responseData); 

      if (!response.ok) {
        throw new Error(responseData.message || `API Error: ${response.status}`);
      }
      
      const carrierId = responseData.data?.user?.carrier?._id;
      const token = responseData.token || responseData.data?.token;
      const companyName = extractCompanyName(responseData);

      if (token) {
        // Save the full API response to local storage
        if (typeof window !== 'undefined') {
          localStorage.setItem(API_RESPONSE_STORAGE_KEY, JSON.stringify(responseData));
        }
        
        storeCarrierId(carrierId);
        storeApiToken(token, companyName); 
        setStoredTokenValue(token); 
        showToast({ title: 'Success', description: 'Token obtained. Full API response saved and displayed below.', variant: 'success' });
      } else {
        throw new Error('Token not found in API response.');
      }
    } catch (error) {
      console.error('Error obtaining token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to obtain token.';
      showToast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      clearApiToken(); 
      clearCarrierId();
      setStoredTokenValue(null); 
    } finally {
      setIsFetchingToken(false);
      setAppIsLoading(false);
    }
  };

  const handleClearTokenAndCompany = () => {
    clearApiToken();
    clearCarrierId();
    setStoredTokenValue(null);
    setFullApiResponse(null);
    
    // Clear the stored API response from local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(API_RESPONSE_STORAGE_KEY);
    }
    
    showToast({ title: 'Token & Context Cleared', description: 'Authentication token and API target context removed.' });
  };
  
  if (isAuthLoading || !isAuthenticated) {
     return (
      <AppLayout pageTitle="Loading API Token Setup...">
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  const pageTitleString = "API Authentication Token";
  const isLoading = appIsLoading || isFetchingToken;
  const isTokenActive = !!storedTokenValue;

  return (
    <AppLayout pageTitle={pageTitleString}>
      <ScrollArea className="flex-grow"> 
        <div className="p-1 space-y-6"> 
          <div className="flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-muted-foreground" />
              <span className="text-lg font-semibold">Configure API Access & Target Context</span>
          </div>
          <CardDescription>
            Use this page to obtain a bearer token from the API. The token and extracted company information (if found) will be stored and used for "Export Data" API calls. The full API response is displayed for inspection.
          </CardDescription>
          
          <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>{isTokenActive ? "API Token Active" : "Login to Target API"}</CardTitle>
              <CardDescription>
                {isTokenActive 
                  ? "An API token is currently stored. Clear it using the 'Current API Context' section below to obtain a new one." 
                  : "Enter your API credentials to get a bearer token."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={currentUserEmail || "johndoe@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading || isTokenActive}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isTokenActive}
                    placeholder="Enter API password (can be empty)"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty if your API password is an empty string.</p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || isTokenActive}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Get/Refresh Token
                </Button>
              </form>
            </CardContent>
          </Card>

          {(storedTokenValue || currentCompanyName) && (
            <Card className="w-full max-w-lg mx-auto mt-6">
              <CardHeader>
                <CardTitle>Current API Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {storedTokenValue && (
                  <p className="text-sm text-green-600">
                    An API token is currently stored
                    {currentCompanyName ? ` for ${currentCompanyName}.` : '.'}
                  </p>
                )}
                {!storedTokenValue && currentCompanyName && ( 
                   <div className="flex items-center text-sm text-blue-600">
                    <Building className="mr-2 h-4 w-4"/> 
                    Target Company: <span className="font-semibold ml-1">{currentCompanyName}</span> (Token missing)
                  </div>
                )}
                {!storedTokenValue && !currentCompanyName && <p className="text-sm text-muted-foreground">No token or company context stored.</p>}
                
                <Button onClick={handleClearTokenAndCompany} variant="outline" className="w-full" disabled={isLoading}>
                  <Trash2 className="mr-2 h-4 w-4" /> Clear Stored Token & Target Context
                </Button>
              </CardContent>
            </Card>
          )}
          {!storedTokenValue && !currentCompanyName && !isLoading && (
              <p className="text-center text-muted-foreground mt-6">No token or company context is currently stored. Use the form above.</p>
          )}

          {fullApiResponse && (
            <Card className="w-full max-w-2xl mx-auto mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="mr-2 h-5 w-5" />
                  Full API Response
                </CardTitle>
                <CardDescription>This is the complete JSON response received from the authentication API.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  <Textarea
                    value={JSON.stringify(fullApiResponse, null, 2)}
                    readOnly
                    className="font-mono text-xs bg-muted/30"
                    rows={15}
                  />
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
