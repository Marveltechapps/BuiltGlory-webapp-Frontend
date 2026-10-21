import { AccountSettings } from '../../../components/account/Settings';
import { RequireAuth } from '../../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to manage your account" sub=""><AccountSettings /></RequireAuth>;
}
