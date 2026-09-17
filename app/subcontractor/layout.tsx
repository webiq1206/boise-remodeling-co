import {withBrandPageMetadata} from '@/lib/brand-page-metadata';
import { Metadata } from "next";

export const metadata: Metadata = withBrandPageMetadata(({
  title: "Subcontractor Portal",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    nosnippet: true,
  },
}), "__layout__");

export default function SubcontractorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
