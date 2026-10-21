import { BrowseView } from '../../components/property/BrowseView';

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ type?: string; search?: string }> }) {
  const { type, search } = await searchParams;
  return <BrowseView key={`${type ?? ''}|${search ?? ''}`} initialType={type} initialSearch={search} />;
}
