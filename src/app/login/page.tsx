import { AuthScreen } from '../../components/auth/AuthScreen';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const { mode, next } = await searchParams;
  return <AuthScreen key={mode ?? 'login'} initialMode={mode === 'signup' ? 'signup' : 'login'} next={next} />;
}
