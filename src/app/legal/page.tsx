import { LegalPage } from '../../components/legal/LegalPage';

export default async function Page({ searchParams }: { searchParams: Promise<{ doc?: string }> }) {
  const { doc } = await searchParams;
  return <LegalPage key={doc ?? 'terms'} initialDoc={doc} />;
}
