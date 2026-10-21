import { DealsList } from '../../components/buyer/DealsList';
import { RequireAuth } from '../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to see your deals" sub="Follow every deal you're buying or selling."><DealsList /></RequireAuth>;
}
