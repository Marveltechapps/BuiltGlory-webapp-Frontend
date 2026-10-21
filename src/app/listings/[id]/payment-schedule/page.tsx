import { PaymentSchedule } from '../../../../components/seller/ListingFlow';
import { RequireAuth } from '../../../../components/layout/RequireAuth';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequireAuth title="Sign in to manage this listing"><PaymentSchedule key={id} id={id} /></RequireAuth>;
}
