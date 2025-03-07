import Link from 'next/link';

import { siteConfig } from '@/config/site';
import { MainNav } from '@/components/site/main-nav';

import HeaderEnd from '../organisms/header-end';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={siteConfig.mainNav} />
        <HeaderEnd />
      </div>
    </header>
  );
}
