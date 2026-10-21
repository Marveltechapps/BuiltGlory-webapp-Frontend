import { ChangePhone } from '../../../components/account/Profile';
import { RequireAuth } from '../../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to change your phone number" sub=""><ChangePhone /></RequireAuth>;
}
