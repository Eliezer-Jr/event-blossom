import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container flex flex-col items-center justify-center py-24 text-center space-y-6">
        <div className="p-4 rounded-full bg-destructive/10">
          <ShieldX className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="font-heading text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You don't have the required permissions to access the admin dashboard. Please contact an administrator to request access.
        </p>
        <Button onClick={() => navigate('/')} variant="outline">
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default AccessDenied;
