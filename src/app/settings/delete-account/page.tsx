import { DeleteAccount } from '../../../components/account/DeleteAccount';
import { RequireAuth } from '../../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to manage your account" sub=""><DeleteAccount /></RequireAuth>;
}
