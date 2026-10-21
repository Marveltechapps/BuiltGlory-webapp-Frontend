import { FaqTopic } from '../../../components/support/Help';

export default async function Page({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  return <FaqTopic topicId={decodeURIComponent(topic)} />;
}
