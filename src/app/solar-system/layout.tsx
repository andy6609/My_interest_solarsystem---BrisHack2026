import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function SolarSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
