import { useState } from "react";
import { ScrollText, Stethoscope, Users } from "lucide-react";
import { Separator } from "@/frontend/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/frontend/components/ui/sidebar";
import { DiagnosticsPage } from "./DiagnosticsPage";
import { DriversPage } from "./DriversPage";
import { LogsPage } from "./LogsPage";

type Section = "logs" | "diagnostics" | "drivers";

const NAV_ITEMS: {
  id: Section;
  label: string;
  icon: typeof ScrollText;
}[] = [
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "diagnostics", label: "Diagnostics", icon: Stethoscope },
  { id: "drivers", label: "Drivers", icon: Users },
];

const SECTION_TITLES: Record<Section, string> = {
  logs: "Incoming Logs",
  diagnostics: "Fault Diagnostics",
  drivers: "Driver Profiles",
};

export function DashboardPage() {
  const [section, setSection] = useState<Section>("logs");

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <span className="px-2 py-1 text-sm font-semibold">Car Dashboard</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Monitor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={section === id}
                      onClick={() => setSection(id)}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-medium">{SECTION_TITLES[section]}</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
          {section === "logs" && <LogsPage />}
          {section === "diagnostics" && <DiagnosticsPage />}
          {section === "drivers" && <DriversPage />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
