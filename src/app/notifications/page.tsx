import { Notifications } from '../../components/account/Notifications';
import { RequireAuth } from '../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to see notifications" sub="Updates about your enquiries, visits and listings appear here."><Notifications /></RequireAuth>;
}
