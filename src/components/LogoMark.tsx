export function LogoMark({ className = "size-9" }: { className?: string }) {
  return <img src="/favicon.ico" alt="Drone Soccer" className={`${className} rounded-lg object-contain`} />;
}
