import { Bot, BookOpen, MessageSquareWarning } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Separator } from '#/components/ui/separator'
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
} from '#/components/ui/sidebar'

const NAV_ITEMS = [
  { id: 'queries', label: 'LLM Queries', icon: Bot, to: '/' as const },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, to: '/knowledge' as const },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareWarning, to: '/feedback' as const },
]

function isNavItemActive(itemId: string, pathname: string): boolean {
  if (itemId === 'queries') return pathname === '/' || pathname.startsWith('/traces/')
  if (itemId === 'knowledge') return pathname.startsWith('/knowledge')
  if (itemId === 'feedback') return pathname.startsWith('/feedback')
  return false
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activeItem = NAV_ITEMS.find((item) => isNavItemActive(item.id, pathname))

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <span className="px-2 py-1 text-sm font-semibold">Backend Dashboard</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Monitor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(({ id, label, icon: Icon, to }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton asChild isActive={isNavItemActive(id, pathname)}>
                      <Link to={to}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-medium">{activeItem?.label ?? 'LLM Query Pipeline'}</h1>
        </header>
        <div className="flex min-w-0 flex-1 flex-col overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
