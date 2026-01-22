import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Activity, Clock } from 'lucide-react';

interface LogEntry {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching logs:', error);
      setIsLoading(false);
      return;
    }

    setLogs((data as LogEntry[]) || []);
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActionColor = (action: string) => {
    if (action.includes('error') || action.includes('fail')) {
      return 'bg-destructive/10 text-destructive border-destructive/20';
    }
    if (action.includes('create') || action.includes('upload')) {
      return 'bg-success/10 text-success border-success/20';
    }
    if (action.includes('delete') || action.includes('remove')) {
      return 'bg-warning/10 text-warning border-warning/20';
    }
    return 'bg-muted text-muted-foreground';
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-card p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">System Logs</h1>
                <p className="text-muted-foreground">Monitor system activity and events</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Logs list */}
        <ScrollArea className="flex-1">
          <div className="max-w-6xl mx-auto p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No logs found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search.' : 'No system activity recorded yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={getActionColor(log.action)}>
                              {log.action}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(log.created_at)}
                            </span>
                          </div>

                          {log.details && (
                            <pre className="text-xs text-muted-foreground bg-muted p-2 rounded-md overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}

                          {log.user_id && (
                            <p className="text-xs text-muted-foreground mt-2">
                              User: {log.user_id.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </AppLayout>
  );
}
