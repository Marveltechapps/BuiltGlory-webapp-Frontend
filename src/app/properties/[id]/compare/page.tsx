import { CompareView } from '../../../../components/property/CompareView';

export default async function ComparePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ with?: string }> }) {
  const { id } = await params;
  const { with: withId } = await searchParams;
  return <CompareView propertyId={id} withId={withId} />;
}
