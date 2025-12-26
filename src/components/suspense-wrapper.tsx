import { Suspense } from "react";

export function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>{children}</Suspense>
  );
}
