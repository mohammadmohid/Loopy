export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh bg-neutral-100 border-2 border-neutral-200">
      {children}
    </div>
  );
}
