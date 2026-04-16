import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, Settings, LayoutDashboard, Wrench, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const agentTabs = [
  { path: '/', icon: Home, label: 'Tickets' },
  { path: '/attending', icon: MessageSquare, label: 'Atendendo' },
  { path: '/contacts', icon: Users, label: 'Contatos' },
  { path: '/settings', icon: Settings, label: 'Config' },
];

const adminTabs = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/settings', icon: Settings, label: 'Config' },
];

const devTabs = [
  { path: '/developer', icon: Wrench, label: 'Sistema' },
  { path: '/settings', icon: Settings, label: 'Config' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (pathname.startsWith('/chat/')) return null;

  const profile = user?.profile || 'agent';
  const tabs = profile === 'admin' ? adminTabs : profile === 'developer' ? devTabs : agentTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const active = tab.path === '/' ? pathname === '/' :
            tab.path === '/admin' ? pathname === '/admin' :
            tab.path === '/developer' ? pathname === '/developer' :
            pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
