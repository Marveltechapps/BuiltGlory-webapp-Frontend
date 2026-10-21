import { EnquiryStatus } from '../../../components/buyer/EnquiryStatus';
import { RequireAuth } from '../../../components/layout/RequireAuth';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequireAuth title="Sign in to see this enquiry"><EnquiryStatus key={id} id={id} /></RequireAuth>;
}
