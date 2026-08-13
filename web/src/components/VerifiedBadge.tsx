// Same mark as the app's own logo (public/icons/icon-source.svg) — purple square with a
// white V-stroke — recolored green to read as "verified" while staying visually consistent
// with the app's own branding instead of a generic checkmark glyph.
export default function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="ตรวจสอบโดยแอดมินแล้ว">
      <rect width="512" height="512" fill="#16a34a" />
      <path d="M140 158 L256 384 L372 158" stroke="#ffffff" strokeWidth="58" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
