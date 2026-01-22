import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Scale,
  MessageSquare,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function AppLayout({ children, sidebar }: AppLayoutProps) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { path: '/chat', label: 'Chat', icon: MessageSquare, roles: ['user', 'legal_analyst', 'admin'] },
    { path: '/documents', label: 'Documents', icon: FileText, roles: ['legal_analyst', 'admin'] },
    { path: '/users', label: 'Users', icon: Users, roles: ['admin'] },
    { path: '/logs', label: 'System Logs', icon: Settings, roles: ['admin'] },
  ];

  const visibleNavItems = navItems.filter((item) => role && item.roles.includes(role));

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', className: 'bg-destructive/10 text-destructive' };
      case 'legal_analyst':
        return { label: 'Analyst', className: 'bg-accent/10 text-accent' };
      default:
        return { label: 'User', className: 'bg-muted text-muted-foreground' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-sidebar flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
          <Link to="/chat" className="flex items-center gap-3">
            <Scale className="h-8 w-8 text-sidebar-primary" />
            <span className="text-xl font-serif font-bold text-sidebar-foreground">LexAdvisor</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-medium">
                    {user?.email?.[0].toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user?.email}
                  </p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', roleBadge.className)}>
                    {roleBadge.label}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <Shield className="h-4 w-4" />
                <span>Role: {role}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="font-serif font-bold text-foreground">LexAdvisor</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page content with optional sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {sidebar && (
            <div className="hidden md:block w-80 border-r border-border bg-card">
              {sidebar}
            </div>
          )}
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
}
