import { EnquiryStatus } from '../../../components/buyer/EnquiryStatus';
import { RequireAuth } from '../../../components/layout/RequireAuth';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ act?: string }> }) {
  const { id } = await params;
  const { act } = await searchParams;
  return <RequireAuth title="Sign in to see this enquiry"><EnquiryStatus key={`${id}-${act ?? ''}`} id={id} act={act === '1'} /></RequireAuth>;
}
