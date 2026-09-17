import {withBrandPageMetadata} from '@/lib/brand-page-metadata';
import {P5Estimator} from "@/components/P5Estimator";
export const metadata=withBrandPageMetadata(({title:"Project estimator review",robots:{index:false,follow:false}}), "/estimate/p5-preview");
export default function EstimatorPreview(){return <main style={{minWidth:0}}><P5Estimator layout="page"/></main>;}
