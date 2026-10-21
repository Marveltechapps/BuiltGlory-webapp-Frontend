import { Onboarding } from '../../components/auth/Onboarding';

export default async function Page({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;
  return <Onboarding key={stage ?? 'start'} startStage={stage} />;
}
