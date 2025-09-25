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
  Shield,
  Globe,
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
  { name: 'City Validation', id: 'cityValidation', icon: MapPin, description: 'Validate and standardize city names' },
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

  const isDataLoaded = data?.length > 0;

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
              <h1 className="text-xl font-bold group-data-[collapsible=icon]:hidden">Data Bridge</h1>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent >
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
                <SidebarGroupLabel
                  className="group-data-[collapsible=icon]:hidden"
                >
                  Data Management
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        disabled={isExportDataDisabled}
                        tooltip={{children: "Export Data", side:"right", align:"center"}}
                        className={cn("justify-start", isExportDataDisabled && "opacity-50 pointer-events-none")}
                      >
                        <Link href="/export-data">
                          <DatabaseZap className="h-5 w-5" />
                          <span className="group-data-[collapsible=icon]:hidden">Export Data</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        disabled={isLookupPageDisabled}
                        tooltip={{children: "Lookups", side:"right", align:"center"}}
                        className={cn("justify-start", isLookupPageDisabled && "opacity-50 pointer-events-none")}
                      >
                        <Link href="/lookups">
                          <Cpu className="h-5 w-5" />
                          <span className="group-data-[collapsible=icon]:hidden">Lookups</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-2" />

            <SidebarGroup>
                <SidebarGroupLabel
                  className="group-data-[collapsible=icon]:hidden"
                >
                  Admin
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={{children: "Base URLs", side:"right", align:"center"}}
                        className="justify-start"
                      >
                        <Link href="/admin/base-urls">
                          <Globe className="h-5 w-5" />
                          <span className="group-data-[collapsible=icon]:hidden">Base URLs</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-2" />

            <SidebarGroup>
                <SidebarGroupLabel
                  className="group-data-[collapsible=icon]:hidden"
                >
                  Settings
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={{children: "AI Settings", side:"right", align:"center"}}
                        className="justify-start"
                      >
                        <Link href="/ai-settings">
                          <Settings className="h-5 w-5" />
                          <span className="group-data-[collapsible=icon]:hidden">AI Settings</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={{children: "Setup", side:"right", align:"center"}}
                        className="justify-start"
                      >
                        <Link href="/setup">
                          <KeyRound className="h-5 w-5" />
                          <span className="group-data-[collapsible=icon]:hidden">Setup</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={logout}
                tooltip={{children: "Logout", side:"right", align:"center"}}
                className="justify-start text-destructive hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  );
}
