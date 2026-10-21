import { ListingsList } from '../../components/seller/ListingsList';
import { RequireAuth } from '../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to see your listings" sub="List your property and track its verification."><ListingsList /></RequireAuth>;
}
