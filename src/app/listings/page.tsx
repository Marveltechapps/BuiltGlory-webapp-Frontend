import { ListingsList } from '../../components/seller/ListingsList';
import { RequireAuth } from '../../components/layout/RequireAuth';

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <RequireAuth title="Sign in to see your listings" sub="List your property and track its verification."><ListingsList key={tab ?? 'All'} tab={tab} /></RequireAuth>;
}
