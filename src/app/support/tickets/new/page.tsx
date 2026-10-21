import { RaiseTicket } from '../../../../components/support/Tickets';
import { RequireAuth } from '../../../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to raise a ticket" sub="Tickets are tracked against your account."><RaiseTicket /></RequireAuth>;
}
