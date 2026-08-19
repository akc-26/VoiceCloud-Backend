import { Link } from 'react-router-dom';
import { WEBSITE_BRAND } from '@/branding';

interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Link className="vc-brand-logo" to="/" aria-label={`${WEBSITE_BRAND.identity.name} home`}>
      <img
        className="vc-brand-logo__image"
        src={compact ? WEBSITE_BRAND.assets.logoMark : WEBSITE_BRAND.assets.logoHorizontal}
        alt={WEBSITE_BRAND.identity.name}
      />
    </Link>
  );
}
