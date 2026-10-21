import { LiveChat } from '../../../components/support/Tickets';
import { RequireAuth } from '../../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to chat with support" sub="Live chat is linked to your account."><LiveChat /></RequireAuth>;
}
