import { EnquiriesList } from '../../components/buyer/EnquiriesList';
import { RequireAuth } from '../../components/layout/RequireAuth';

export default function Page() {
  return <RequireAuth title="Sign in to see your enquiries" sub="Track every enquiry from submission to registration."><EnquiriesList /></RequireAuth>;
}
