import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';

const docsOptions = {
  ...baseOptions,
  nav: {
    ...baseOptions.nav,
    component: null
  }
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout 
      tree={source.pageTree} 
      {...docsOptions}
    >
      {children}
    </DocsLayout>
  );
}
