import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function AuthField({ label, hint, error, type = 'text', ...props }: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  const inputType = password && visible ? 'text' : type;
  return (
    <label className="vc-auth-field">
      <span className="vc-auth-field__label">{label}</span>
      <span className={`vc-auth-field__control${error ? ' is-error' : ''}`}>
        <input type={inputType} {...props} />
        {password ? (
          <button type="button" className="vc-auth-field__reveal" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide password' : 'Show password'}>
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        ) : null}
      </span>
      {error ? <span className="vc-auth-field__error">{error}</span> : hint ? <span className="vc-auth-field__hint">{hint}</span> : null}
    </label>
  );
}
