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
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[hsl(217,91%,25%)] via-[hsl(217,91%,35%)] to-[hsl(217,80%,20%)] items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative text-center space-y-8 max-w-md">
          <img src={logo} alt="GBCC Logo" className="h-32 w-32 mx-auto drop-shadow-2xl" />
          <div>
            <h1 className="font-heading text-4xl font-bold text-white leading-tight">
              Ministers' Conference
            </h1>
            <p className="text-white/70 mt-3 text-lg">
              Ghana Baptist Convention
            </p>
          </div>
          <div className="h-px w-24 mx-auto bg-white/20" />
          <p className="text-white/50 text-sm">
            Secure sign-in for conference administrators and event managers.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="text-center lg:hidden">
            <img src={logo} alt="GBCC Logo" className="h-16 w-16 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-bold">Ministers' Conference</h2>
            <p className="text-sm text-muted-foreground">Ghana Baptist Convention</p>
          </div>

          <div>
            <h1 className="font-heading text-2xl font-bold">
              {step === 'phone' ? 'Welcome back' : 'Verify your number'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {step === 'phone'
                ? 'Enter your phone number to receive a verification code.'
                : `We sent a 6-digit code to ${normalizePhone(phone)}`}
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    required
                    className="pl-9 h-11"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0241234567"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  'Send OTP'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
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
              <Button type="submit" className="w-full h-11" disabled={loading || otp.length < 6}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { setStep('phone'); setOtp(''); }}
              >
                ← Change phone number
              </button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">← Back to events</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
