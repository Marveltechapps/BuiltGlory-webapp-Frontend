/** Native share sheet when available, otherwise copy the link. */
export async function shareLink(title: string, url = window.location.href): Promise<'shared' | 'copied'> {
  if (navigator.share) { await navigator.share({ title, url }); return 'shared'; }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
