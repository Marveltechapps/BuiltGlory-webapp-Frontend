export interface NavSub { href: string; label: string }
export interface NavItem {
  href: string;
  icon: string;
  label: string;
  unreadBadge?: boolean;
  authOnly?: boolean;
  match?: (path: string) => boolean;
  subs?: NavSub[];
}
export interface NavGroup { group: string; items: NavItem[]; authOnly?: boolean }

const listingDeal = /^\/listings\/[^/]+\/(deal-confirmed|payment-schedule|registration)$/;
const listingFlow = /^\/listings\/[^/]+(\/(offer|accept-offer|counter|counter-sent|sold))?$/;

export const NAV: NavGroup[] = [
  { group: 'Discover', items: [
    { href: '/', icon: 'layout-dashboard', label: 'Home', match: (p) => p === '/' },
    { href: '/browse', icon: 'search', label: 'Buy', match: (p) => p === '/browse' || /^\/properties\/[^/]+$/.test(p) },
    { href: '/sell', icon: 'tag', label: 'Sell' },
  ] },
  { group: 'Activity', authOnly: true, items: [
    { href: '/notifications', icon: 'bell', label: 'Notifications', unreadBadge: true },
  ] },
  { group: 'Account', items: [
    { href: '/profile', icon: 'user', label: 'Profile', match: (p) => p.startsWith('/profile') },
    { href: '/enquiries', icon: 'inbox', label: 'My Enquiries', match: (p) => p.startsWith('/enquiries') },
    { href: '/visits', icon: 'calendar', label: 'My Visits' },
    { href: '/deals', icon: 'handshake', label: 'My Deals', match: (p) => p === '/deals' || listingDeal.test(p) },
    { href: '/listings', icon: 'tag', label: 'My Listings', match: (p) => p === '/listings' || listingFlow.test(p) },
    { href: '/favorites', icon: 'heart', label: 'Saved Properties', authOnly: true },
    { href: '/settings', icon: 'settings', label: 'Settings', match: (p) => p.startsWith('/settings') || p === '/about' || p === '/legal', subs: [
      { href: '/settings/account', label: 'Account Settings' },
      { href: '/settings/notifications', label: 'Notification Settings' },
      { href: '/settings/app', label: 'App Settings' },
    ] },
    { href: '/help', icon: 'circle-help', label: 'Help & Support', match: (p) => p.startsWith('/help') || p.startsWith('/support'), subs: [
      { href: '/help', label: 'FAQs' },
      { href: '/support', label: 'Customer Support' },
      { href: '/support/call', label: 'Call Us' },
    ] },
  ] },
];

export const isActive = (item: NavItem, path: string) => (item.match ? item.match(path) : path === item.href);

/** Top-level destinations reached from the sidebar/header — no back arrow there (the design's `jump()`). */
const ROOTS = new Set(['/', '/browse', '/sell', '/notifications', '/profile', '/enquiries', '/visits', '/deals', '/listings', '/favorites', '/settings', '/settings/account', '/settings/notifications', '/settings/app', '/help', '/support', '/support/call', '/search']);
export const isRootPath = (path: string) => ROOTS.has(path);

const EXACT: Record<string, string> = {
  '/': 'Home', '/browse': 'Buy', '/sell': 'Sell', '/favorites': 'Saved', '/enquiries': 'Enquiries', '/deals': 'My Deals',
  '/listings': 'My Listings', '/notifications': 'Notifications', '/profile': 'Profile', '/profile/edit': 'Edit Profile',
  '/profile/change-phone': 'Change Phone', '/settings': 'Settings', '/settings/account': 'Account Settings',
  '/settings/notifications': 'Notification Settings', '/settings/app': 'App Settings', '/settings/privacy': 'Privacy & Data',
  '/settings/delete-account': 'Delete Account', '/help': 'Help & FAQs', '/support': 'Customer Support', '/support/call': 'Call Us',
  '/support/live-chat': 'Live Chat', '/support/tickets/new': 'Raise Ticket', '/about': 'About', '/legal': 'Legal', '/search': 'Search', '/visits': 'My Visits',
};

const SUFFIX: Array<[RegExp, string]> = [
  [/^\/properties\/[^/]+$/, 'Property'], [/\/enquiry$/, 'Enquiry'], [/\/visit$/, 'Schedule Visit'], [/\/vr-tour$/, '360° Tour'],
  [/\/aerial$/, 'Aerial View'], [/\/specs$/, 'Specifications'], [/\/location$/, 'Location'], [/\/floor-plan$/, 'Floor Plan'],
  [/\/nri-call$/, 'Schedule Video Call'], [/\/compare$/, 'Compare'], [/^\/enquiries\/[^/]+$/, 'Enquiry Status'],
  [/^\/listings\/[^/]+$/, 'Listing Status'], [/\/offer$/, 'Builtglory Offer'], [/\/accept-offer$/, 'Accept Offer'], [/\/counter$/, 'Counter Offer'],
  [/\/counter-sent$/, 'Counter Offer Sent'], [/\/deal-confirmed$/, 'Deal Confirmed'], [/\/payment-schedule$/, 'Payment Schedule'],
  [/\/registration$/, 'Registration'], [/\/sold$/, 'Sold'], [/^\/help\/[^/]+$/, 'Help & FAQs'], [/^\/support\/tickets\/[^/]+$/, 'Ticket'],
];

export const titleFor = (path: string) => EXACT[path] ?? SUFFIX.find(([re]) => re.test(path))?.[1] ?? 'Builtglory';
