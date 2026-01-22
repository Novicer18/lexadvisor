import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Shield, Users as UsersIcon, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AppRole = 'admin' | 'legal_analyst' | 'user';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  created_at: string;
}

export default function Users() {
  const { user: currentUser, role: currentRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);

    // Fetch profiles and roles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, created_at');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setIsLoading(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      setIsLoading(false);
      return;
    }

    // Combine data
    const usersData: UserWithRole[] = (profiles || []).map((profile) => {
      const userRole = roles?.find((r) => r.user_id === profile.user_id);
      return {
        id: profile.user_id,
        email: '', // We don't have access to auth.users
        full_name: profile.full_name,
        role: (userRole?.role as AppRole) || 'user',
        created_at: profile.created_at,
      };
    });

    setUsers(usersData);
    setIsLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (currentRole !== 'admin') return;
    if (userId === currentUser?.id) {
      toast({
        title: 'Cannot change own role',
        description: 'You cannot change your own role.',
        variant: 'destructive',
      });
      return;
    }

    // Delete existing role and insert new one
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      toast({
        title: 'Error updating role',
        description: deleteError.message,
        variant: 'destructive',
      });
      return;
    }

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: newRole });

    if (insertError) {
      toast({
        title: 'Error updating role',
        description: insertError.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Role updated',
      description: `User role has been changed to ${newRole}.`,
    });

    fetchUsers();
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return { icon: Shield, className: 'bg-destructive/10 text-destructive border-destructive/20' };
      case 'legal_analyst':
        return { icon: UserCheck, className: 'bg-accent/10 text-accent border-accent/20' };
      default:
        return { icon: UsersIcon, className: 'bg-muted text-muted-foreground border-muted' };
    }
  };

  const roleStats = {
    admin: users.filter((u) => u.role === 'admin').length,
    legal_analyst: users.filter((u) => u.role === 'legal_analyst').length,
    user: users.filter((u) => u.role === 'user').length,
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-card p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-serif font-bold text-foreground">User Management</h1>
                <p className="text-muted-foreground">Manage user roles and permissions</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="shadow-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Shield className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{roleStats.admin}</p>
                    <p className="text-sm text-muted-foreground">Admins</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <UserCheck className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{roleStats.legal_analyst}</p>
                    <p className="text-sm text-muted-foreground">Analysts</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <UsersIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{roleStats.user}</p>
                    <p className="text-sm text-muted-foreground">Users</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Users list */}
        <ScrollArea className="flex-1">
          <div className="max-w-6xl mx-auto p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search.' : 'No users registered yet.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  const RoleIcon = roleBadge.icon;

                  return (
                    <Card key={user.id} className="shadow-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                              {user.full_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {user.full_name || 'Unnamed User'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              ID: {user.id.slice(0, 8)}...
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className={roleBadge.className}>
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {user.role}
                            </Badge>

                            {currentRole === 'admin' && user.id !== currentUser?.id && (
                              <Select
                                value={user.role}
                                onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="legal_analyst">Legal Analyst</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </AppLayout>
  );
}
