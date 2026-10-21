import { EditProfile } from '../../../components/account/Profile';
import { RequireAuth } from '../../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to edit your profile" sub=""><EditProfile /></RequireAuth>;
}
