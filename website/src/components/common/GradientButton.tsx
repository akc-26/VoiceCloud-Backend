import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function GradientButton({
  children,
  className = '',
  variant = 'primary',
  ...props
}: PropsWithChildren<GradientButtonProps>) {
  return (
    <button
      {...props}
      className={`vc-button vc-button--${variant} ${className}`.trim()}
      type={props.type ?? 'button'}
    >
      {children}
    </button>
  );
}
