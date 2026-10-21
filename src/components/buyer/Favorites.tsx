'use client';

import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { Empty } from '../ui/Card';
import { PageWrap, SectionHead } from '../ui/PageWrap';
import { PropCard } from '../ui/PropCard';
import { ErrorState, Loading } from '../ui/StateViews';
import { useFavoriteProperties } from '../../hooks/useProperties';
import { useSession } from '../../context/SessionContext';

export function Favorites() {
  const router = useRouter();
  const { favorites } = useSession();
  const { data, loading, error, reload } = useFavoriteProperties(true);
  // Hide cards un-saved on this page without waiting for a refetch.
  const list = (data ?? []).filter((p) => favorites.has(p._id));
  return (
    <PageWrap>
      <SectionHead title="Saved properties" sub={`${list.length} properties you're keeping an eye on`} />
      {loading && !data ? <Loading label="Loading saved properties" />
        : error ? <ErrorState message={error} onRetry={reload} />
        : list.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{list.map((p) => <PropCard key={p._id} p={p} />)}</div>
        : <Empty icon="heart" title="No saved properties yet" sub="Tap the heart on any listing to save it here." action={<Button onClick={() => router.push('/browse')} iconRight="arrow-right">Browse properties</Button>} />}
    </PageWrap>
  );
}
