import { Profile } from '../../components/account/Profile';
import { RequireAuth } from '../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to see your profile" sub="Manage your personal details and account."><Profile /></RequireAuth>;
}
