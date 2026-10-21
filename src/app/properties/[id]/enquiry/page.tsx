import { EnquiryForm } from '../../../../components/property/EnquiryForm';
import { RequireAuth } from '../../../../components/layout/RequireAuth';

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequireAuth title="Sign in to submit an enquiry" sub="Enquiries are linked to your verified mobile number."><EnquiryForm propertyId={id} /></RequireAuth>;
}
