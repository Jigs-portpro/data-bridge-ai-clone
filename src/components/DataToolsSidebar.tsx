
"use client";

import { Button } from '@/components/ui/button';
import { useAppContext } from '@/hooks/useAppContext';
import { LogoIcon } from '@/components/icons/LogoIcon';
import {
  Wand2,
  Sparkles,
  Shuffle,
  Siren,
  CopyCheck,
  Github,
  LogOut,
  Settings,
  KeyRound,
  Send,
  Cpu, 
  MapPin,
  DatabaseZap, // Changed from ListChecks/Trash2
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';


const toolConfig = [
  { name: 'Data Correction', id: 'correction', icon: Wand2, description: 'Suggest casing & format fixes' },
  { name: 'Data Enrichment', id: 'enrichment', icon: Sparkles, description: 'Add new data or insights' },
  { name: 'Column Reorder', id: 'reorder', icon: Shuffle, description: 'Intelligently reorder columns' },
  { name: 'Anomaly Report', id: 'anomaly', icon: Siren, description: 'Identify potential anomalies' },
  { name: 'Duplicate Detection', id: 'duplicate', icon: CopyCheck, description: 'Find and flag duplicates' },
  { name: 'Address Processing', id: 'addressProcessing', icon: MapPin, description: 'Clean & geocode addresses' },
];

export function DataToolsSidebar() {
  const { 
    openDialog, 
    data, 
    isAuthenticated, 
    logout, 
    // fetchAndStoreChassisOwners, // No longer called directly from sidebar
    isLoading: isAppLoading,
    // chassisOwnersData, // No longer directly needed for sidebar logic
    // clearChassisOwnersData // No longer called directly from sidebar
  } = useAppContext();
  const isDataLoaded = data.length > 0;

  const isAIDisabled = !isDataLoaded || !isAuthenticated;
  const isExportDataDisabled = !isDataLoaded || !isAuthenticated; 
  const isLookupPageDisabled = !isAuthenticated || isAppLoading;


  // const handleFetchChassisOwners = async () => { // Removed
  //     await fetchAndStoreChassisOwners();
  // };

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
        <SidebarHeader className="p-4">
          <Link href="/" passHref>
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center cursor-pointer">
              <LogoIcon className="w-8 h-8 text-primary group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 transition-all" />
              <h1 className="text-2xl font-headline font-semibold text-primary group-data-[collapsible=icon]:hidden">Data Bridge</h1>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">AI Tools</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {toolConfig.map((tool) => (
                            <SidebarMenuItem key={tool.id}>
                            <SidebarMenuButton
                                onClick={() => openDialog(tool.id)}
                                disabled={isAIDisabled}
                                tooltip={{children: tool.name, side:"right", align:"center"}}
                                className={cn("justify-start", isAIDisabled && "opacity-50 pointer-events-none")}
                            >
                                <tool.icon className="h-5 w-5" />
                                <span className="group-data-[collapsible=icon]:hidden">{tool.name}</span>
                            </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarSeparator className="my-2" />

            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Data Management</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                             <Link
                                href="/lookups"
                                passHref
                                legacyBehavior
                                onClick={(e) => { if (isLookupPageDisabled) e.preventDefault(); }}
                                aria-disabled={isLookupPageDisabled}
                                tabIndex={isLookupPageDisabled ? -1 : undefined}
                            >
                                <SidebarMenuButton
                                    disabled={isLookupPageDisabled}
                                    tooltip={{children: "Manage Lookups", side:"right", align:"center"}}
                                    className={cn("justify-start w-full", isLookupPageDisabled && "opacity-50 pointer-events-none")}
                                    asChild
                                >
                                   <a>
                                    <DatabaseZap className="h-5 w-5" />
                                    <span className="group-data-[collapsible=icon]:hidden">Manage Lookups</span>
                                   </a>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarSeparator className="my-2" />
            
            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Data Export</SidebarGroupLabel>
                 <SidebarGroupContent>
                    <SidebarMenu>
                         <SidebarMenuItem>
                            <Link
                                href="/export-data"
                                passHref
                                legacyBehavior // Required for Next.js <Link> with custom child like SidebarMenuButton
                                onClick={(e) => {
                                    if (isExportDataDisabled) {
                                    e.preventDefault();
                                    }
                                }}
                                aria-disabled={isExportDataDisabled}
                                tabIndex={isExportDataDisabled ? -1 : undefined}
                            >
                                <SidebarMenuButton
                                    disabled={isExportDataDisabled} 
                                    tooltip={{children: "Prepare & Export Data", side:"right", align:"center"}}
                                    className={cn(
                                        "justify-start w-full", 
                                        isExportDataDisabled && "opacity-50 pointer-events-none"
                                    )}
                                    asChild // Important for <Link> to correctly style the <a> tag
                                >
                                   <a> {/* This <a> tag is the actual child that <Link> will wrap */}
                                    <Send className="h-5 w-5" />
                                    <span className="group-data-[collapsible=icon]:hidden">Export Data</span>
                                   </a>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </SidebarMenu>
                 </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarSeparator className="my-2" />
            
            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Configuration</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/setup" passHref legacyBehavior
                                onClick={(e) => { if (!isAuthenticated) e.preventDefault();}}
                                aria-disabled={!isAuthenticated}
                                tabIndex={!isAuthenticated ? -1 : undefined}
                            >
                                <SidebarMenuButton
                                    disabled={!isAuthenticated}
                                    tooltip={{children: "Target API Setup", side:"right", align:"center"}}
                                    className={cn("justify-start w-full", !isAuthenticated && "opacity-50 pointer-events-none")}
                                    asChild
                                >
                                   <a>
                                    <Settings className="h-5 w-5" />
                                    <span className="group-data-[collapsible=icon]:hidden">API Setup</span>
                                   </a>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <Link href="/auth-token" passHref legacyBehavior
                                onClick={(e) => { if (!isAuthenticated) e.preventDefault();}}
                                aria-disabled={!isAuthenticated}
                                tabIndex={!isAuthenticated ? -1 : undefined}
                            >
                                <SidebarMenuButton
                                    disabled={!isAuthenticated}
                                    tooltip={{children: "API Auth Token", side:"right", align:"center"}}
                                    className={cn("justify-start w-full", !isAuthenticated && "opacity-50 pointer-events-none")}
                                    asChild
                                >
                                   <a>
                                    <KeyRound className="h-5 w-5" />
                                    <span className="group-data-[collapsible=icon]:hidden">API Auth</span>
                                   </a>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Link href="/ai-settings" passHref legacyBehavior
                                onClick={(e) => { if (!isAuthenticated) e.preventDefault();}}
                                aria-disabled={!isAuthenticated}
                                tabIndex={!isAuthenticated ? -1 : undefined}
                            >
                                <SidebarMenuButton
                                    disabled={!isAuthenticated}
                                    tooltip={{children: "AI Provider Settings", side:"right", align:"center"}}
                                    className={cn("justify-start w-full", !isAuthenticated && "opacity-50 pointer-events-none")}
                                    asChild
                                >
                                   <a>
                                    <Cpu className="h-5 w-5" />
                                    <span className="group-data-[collapsible=icon]:hidden">AI Settings</span>
                                   </a>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 mt-auto group-data-[collapsible=icon]:p-2">
            {isAuthenticated && (
              <>
                <Button variant="ghost" onClick={logout} className="w-full justify-start group-data-[collapsible=icon]:justify-center mb-2">
                    <LogOut className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden ml-2">Logout</span>
                </Button>
                <SidebarSeparator className="my-1 group-data-[collapsible=icon]:mx-0"/>
              </>
            )}
            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" asChild>
                <a href="https://github.com/firebase/genkit/tree/main/studio" target="_blank" rel="noopener noreferrer">
                    <Github className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden ml-2">View on GitHub</span>
                </a>
            </Button>
        </SidebarFooter>
      </Sidebar>
  );
}

