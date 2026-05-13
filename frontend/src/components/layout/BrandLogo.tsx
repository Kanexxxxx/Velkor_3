import Link from 'next/link';

interface BrandLogoProps {
  href?: string;
  className?: string;
}

export function BrandLogo({ href = '/', className = '' }: BrandLogoProps) {
  return (
    <Link href={href} className={`logo ${className}`.trim()} aria-label="VELKOR - início">
      VELKOR
    </Link>
  );
}
