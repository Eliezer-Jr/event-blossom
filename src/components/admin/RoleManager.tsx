import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldCheck, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ALL_ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { value: 'event_manager', label: 'Event Manager', color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'finance_officer', label: 'Finance Officer', color: 'bg-success/10 text-success border-success/20' },
  { value: 'checkin_staff', label: 'Check-in Staff', color: 'bg-warning/10 text-warning border-warning/20' },
];

interface UserWithRoles {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  created_at: string;
  roles: string[];
}

const RoleManager = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningRole, setAssigningRole] = useState<Record<string, string>>({});
  const [busyUsers, setBusyUsers] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-roles', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
      });
      // The invoke with GET doesn't work well with body, use query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles?action=list`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setUsers(result.users || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAssignRole = async (userId: string) => {
    const role = assigningRole[userId];
    if (!role) return;
    setBusyUsers((prev) => new Set(prev).add(userId));
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles?action=assign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_id: userId, role }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(result.message);
      setAssigningRole((prev) => ({ ...prev, [userId]: '' }));
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign role');
    } finally {
      setBusyUsers((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    setBusyUsers((prev) => new Set(prev).add(userId));
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-roles?action=remove`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_id: userId, role }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(result.message);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove role');
    } finally {
      setBusyUsers((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    }
  };

  const getRoleConfig = (role: string) => ALL_ROLES.find((r) => r.value === role);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> User Roles
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Assign Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => {
                    const isBusy = busyUsers.has(u.id);
                    const availableRoles = ALL_ROLES.filter((r) => !u.roles.includes(r.value));
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{u.display_name}</p>
                            <p className="text-xs text-muted-foreground">{u.email || u.phone || '—'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 ? (
                              <span className="text-xs text-muted-foreground">No roles</span>
                            ) : (
                              u.roles.map((role) => {
                                const config = getRoleConfig(role);
                                return (
                                  <Badge
                                    key={role}
                                    variant="outline"
                                    className={`gap-1 ${config?.color || ''}`}
                                  >
                                    {config?.label || role}
                                    <button
                                      onClick={() => handleRemoveRole(u.id, role)}
                                      disabled={isBusy}
                                      className="ml-1 hover:text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                );
                              })
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 items-center">
                            {availableRoles.length > 0 ? (
                              <>
                                <Select
                                  value={assigningRole[u.id] || ''}
                                  onValueChange={(v) => setAssigningRole((prev) => ({ ...prev, [u.id]: v }))}
                                >
                                  <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoles.map((r) => (
                                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!assigningRole[u.id] || isBusy}
                                  onClick={() => handleAssignRole(u.id)}
                                >
                                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">All roles assigned</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManager;
