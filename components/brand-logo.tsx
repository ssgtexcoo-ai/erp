type BrandLogoProps = {
  compact?: boolean;
};

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className="flex items-center justify-center">
      <img
        src="/samruq-logo.png"
        alt="SAMRUQ Qurylys"
        className={compact ? 'h-[72px] w-auto object-contain' : 'h-[160px] w-auto object-contain'}
        style={{ filter: 'drop-shadow(0 4px 16px rgba(216,176,106,0.20))' }}
      />
    </div>
  );
}