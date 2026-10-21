import { Favorites } from '../../components/buyer/Favorites';
import { RequireAuth } from '../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to see saved properties" sub="Save properties you like and find them here."><Favorites /></RequireAuth>;
}
