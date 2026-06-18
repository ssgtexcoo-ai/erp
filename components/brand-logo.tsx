type BrandLogoProps = {
  compact?: boolean;
};

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className={`flex items-center ${compact ? 'scale-[0.96]' : ''}`}>
      <div className={`flex items-center justify-center overflow-hidden ${compact ? 'h-24 w-24 rounded-full border border-[rgba(241,205,127,0.14)] bg-[#111827] shadow-[0_12px_34px_rgba(0,0,0,0.35)]' : 'w-[360px] max-w-full'}`}>
        <img
          src={compact ? '/samruq-mark.svg' : '/samruq-logo.svg'}
          alt="SAMRUQ ERP Qurylys"
          className={compact ? 'h-full w-full object-cover object-[center_top]' : 'h-auto w-full object-contain'}
        />
      </div>
    </div>
  );
}