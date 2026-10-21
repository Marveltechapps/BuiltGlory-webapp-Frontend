import { VrTour } from '../../../../components/property/MediaViews';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VrTour id={id} />;
}
