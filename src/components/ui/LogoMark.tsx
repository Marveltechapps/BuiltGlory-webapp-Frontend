/** Builtglory app icon. `className` sets the box size. */
export function LogoMark({ className = '' }: { className?: string }) {
  // Size comes from the caller’s className, so a fixed next/image box would change the mark.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="" className={className} />;
}
