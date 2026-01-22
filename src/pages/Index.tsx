import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Scale } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft flex flex-col items-center gap-4">
          <Scale className="h-16 w-16 text-primary" />
          <p className="text-muted-foreground font-medium">Loading LexAdvisor...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/chat" replace />;
  }

  return <Navigate to="/auth" replace />;
}
