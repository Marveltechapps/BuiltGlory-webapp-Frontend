import { VisitsList } from '../../components/buyer/VisitsList';
import { RequireAuth } from '../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to see your visits" sub="Reschedule or cancel site visits and video tours."><VisitsList /></RequireAuth>;
}
