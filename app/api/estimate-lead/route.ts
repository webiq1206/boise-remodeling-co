import {retiredEstimatorResponse} from '@/lib/p5/legacyContinuation';
export const dynamic='force-dynamic';
/** This entry point has moved to the shared estimator. No legacy price or lead is issued. */
export async function POST(){return retiredEstimatorResponse();}
