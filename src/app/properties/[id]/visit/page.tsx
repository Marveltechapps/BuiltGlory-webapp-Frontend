import { VisitScheduler } from '../../../../components/property/VisitScheduler';
import { RequireAuth } from '../../../../components/layout/RequireAuth';

export default async function VisitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enquiryId?: string; visitId?: string; type?: string }> }) {
  const { id } = await params;
  const { enquiryId, visitId, type } = await searchParams;
  return <RequireAuth title="Sign in to schedule a visit"><VisitScheduler key={visitId ?? 'new'} propertyId={id} enquiryId={enquiryId} visitId={visitId} visitType={type === 'virtual' ? 'virtual' : 'physical'} /></RequireAuth>;
}
