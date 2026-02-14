import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo-gbcc.png';

const normalizePhone = (phone: string): string => {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) cleaned = '+233' + cleaned.substring(1);
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  return cleaned;
};

const Auth = () => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const { error } = await sendOtp(normalized);
      if (error) throw error;
      toast.success('OTP sent to your phone!');
      setStep('otp');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);
    try {
      const normalized = normalizePhone(phone);
      const { error } = await verifyOtp(normalized, otp);
      if (error) throw error;
      toast.success('Welcome!');
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src={logo} alt="GBCC Logo" className="h-12 w-12 object-contain" />
            <span className="font-heading text-2xl font-bold">EventFlow</span>
          </Link>
          <h1 className="font-heading text-2xl font-bold">
            {step === 'phone' ? 'Sign in with Phone' : 'Enter OTP'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {step === 'phone'
              ? 'Enter your phone number to receive a verification code'
              : `We sent a code to ${normalizePhone(phone)}`}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      required
                      className="pl-9"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0241234567"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    'Send OTP'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                  ) : (
                    'Verify & Sign In'
                  )}
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => { setStep('phone'); setOtp(''); }}
                >
                  Change phone number
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
