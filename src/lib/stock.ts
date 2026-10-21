// Decorative photography from the reference design (the 16 stock images bundled in
// "Builtglory Web App.html"), served from /public/banners. Only used for hero and
// background art — listings always show their own photos.
const STOCK_COUNT = 16;

export const stockUrl = (seed: string) => {
  const n = String(seed || '').split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return `/banners/stock${n % STOCK_COUNT}.jpg`;
};
