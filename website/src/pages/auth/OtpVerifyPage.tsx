import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, LoaderCircle, RotateCcw } from 'lucide-react';
import { apiErrorMessage } from '@/api/client';
import { websiteAuthApi } from '@/auth/auth.api';
import { useWebsiteAuthStore } from '@/auth/auth.store';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';

type OtpState = {
  phoneNumber: string;
  expiresAt?: string;
  resendCooldownSeconds?: number;
  developmentOtp?: string;
  referralCode?: string;
};

const OTP_LENGTH = 6;

function emptyOtpDigits(): string[] {
  return Array.from({ length: OTP_LENGTH }, () => '');
}

export function OtpVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as OtpState | null;
  const phoneNumber = state?.phoneNumber ?? '';
  const referralCode = state?.referralCode;
  const setAuth = useWebsiteAuthStore((s) => s.setAuthResponse);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const canShowDevelopmentOtp =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const [digits, setDigits] = useState<string[]>(emptyOtpDigits);
  const [devOtp, setDevOtp] = useState<string | undefined>(() =>
    canShowDevelopmentOtp ? state?.developmentOtp : undefined,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(state?.resendCooldownSeconds ?? 0);

  const code = useMemo(() => digits.join(''), [digits]);
  const isComplete = /^\d{6}$/.test(code);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (!phoneNumber) {
    return <Navigate replace to="/auth/phone" />;
  }

  function focusDigit(index: number) {
    const boundedIndex = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    inputRefs.current[boundedIndex]?.focus();
    inputRefs.current[boundedIndex]?.select();
  }

  function applyDigits(startIndex: number, rawValue: string) {
    const numeric = rawValue.replace(/\D/g, '').slice(0, OTP_LENGTH - startIndex);
    if (!numeric) return;

    setDigits((current) => {
      const next = [...current];
      numeric.split('').forEach((digit, offset) => {
        next[startIndex + offset] = digit;
      });
      return next;
    });

    const nextIndex = Math.min(startIndex + numeric.length, OTP_LENGTH - 1);
    window.requestAnimationFrame(() => focusDigit(nextIndex));
  }

  function changeDigit(index: number, value: string) {
    const numeric = value.replace(/\D/g, '');

    if (!numeric) {
      setDigits((current) => {
        const next = [...current];
        next[index] = '';
        return next;
      });
      return;
    }

    applyDigits(index, numeric);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const moveToPrevious = !digits[index] && index > 0;
      setDigits((current) => {
        const next = [...current];
        if (next[index]) {
          next[index] = '';
        } else if (index > 0) {
          next[index - 1] = '';
        }
        return next;
      });
      if (moveToPrevious) {
        window.requestAnimationFrame(() => focusDigit(index - 1));
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      setDigits((current) => {
        const next = [...current];
        next[index] = '';
        return next;
      });
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusDigit(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusDigit(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    event.preventDefault();
    applyDigits(index, pasted);
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!isComplete) {
      setError('Enter the 6-digit verification code.');
      focusDigit(digits.findIndex((digit) => !digit));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const auth = await websiteAuthApi.phoneLogin(phoneNumber, code, referralCode);
      setAuth(auth);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      const response = await websiteAuthApi.sendPhoneOtp(phoneNumber);
      setCooldown(response.resendCooldownSeconds ?? 60);
      setDigits(emptyOtpDigits());
      setDevOtp(canShowDevelopmentOtp ? response.otpCode : undefined);
      window.requestAnimationFrame(() => focusDigit(0));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vc-page-width vc-auth-page">
      <AuthVisualPanel variant="phone" title="Verify. Then keep talking." />
      <AuthCard
        title="Verify your phone"
        subtitle={`Enter the six-digit code sent to ${phoneNumber}.`}
      >
        {error ? (
          <div className="vc-auth-alert">
            <AlertCircle size={17} />
            {error}
          </div>
        ) : null}
        <form className="vc-auth-form" onSubmit={verify}>
          <div
            className="vc-otp"
            role="group"
            aria-label="6-digit verification code"
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                className="vc-otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={(event) => changeDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={(event) => handlePaste(index, event)}
                onFocus={(event) => event.currentTarget.select()}
                aria-label={`Verification code digit ${index + 1} of ${OTP_LENGTH}`}
                disabled={busy}
                autoFocus={index === 0}
              />
            ))}
          </div>
          <button
            className="vc-button vc-button--primary vc-auth-submit"
            disabled={busy || !isComplete}
          >
            {busy ? <LoaderCircle className="vc-spin" size={18} /> : null}
            Verify &amp; Continue
          </button>
        </form>
        {devOtp ? (
          <div className="vc-auth-dev-note">
            Development OTP: <strong>{devOtp}</strong>
          </div>
        ) : null}
        <button
          className="vc-auth-text-button"
          type="button"
          disabled={busy || cooldown > 0}
          onClick={() => void resend()}
        >
          <RotateCcw size={15} />{' '}
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </AuthCard>
    </div>
  );
}
