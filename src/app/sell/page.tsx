import { SellWizard } from '../../components/sell/SellWizard';

export default async function SellPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft } = await searchParams;
  return <SellWizard key={draft ?? 'new'} draftId={draft} />;
}
