import { TicketDetail } from '../../../../components/support/Tickets';
import { RequireAuth } from '../../../../components/layout/RequireAuth';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequireAuth title="Sign in to see this ticket"><TicketDetail key={id} id={id} /></RequireAuth>;
}
