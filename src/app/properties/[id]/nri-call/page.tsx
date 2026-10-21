import { NriVideoCall } from '../../../../components/property/NriVideoCall';
import { RequireAuth } from '../../../../components/layout/RequireAuth';

export default async function NriCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequireAuth title="Sign in to schedule a video tour"><NriVideoCall propertyId={id} /></RequireAuth>;
}
