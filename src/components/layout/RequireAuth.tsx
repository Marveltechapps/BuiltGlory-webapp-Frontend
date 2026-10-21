'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '../../context/SessionContext';
import { PageWrap } from '../ui/PageWrap';
import { Empty } from '../ui/Card';
import { Button } from '../ui/Button';

/** Guests can browse, but account screens need a customer token for the `/me/*` endpoints. */
export function RequireAuth({ children, title = 'Sign in to continue', sub = 'Create an account or sign in to view this page.' }: { children: ReactNode; title?: string; sub?: string }) {
  const { signedIn } = useSession();
  const router = useRouter();
  const path = usePathname();
  if (signedIn) return <>{children}</>;
  return (
    <PageWrap className="!max-w-[760px]">
      <Empty icon="lock" title={title} sub={sub}
        action={<Button iconRight="arrow-right" onClick={() => router.push(`/login?mode=login&next=${encodeURIComponent(path)}`)}>Log in</Button>} />
    </PageWrap>
  );
}
