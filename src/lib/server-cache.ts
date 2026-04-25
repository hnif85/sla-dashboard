import { unstable_cache } from "next/cache";
import prisma from "./db";

/**
 * FunnelStages — cached 5 menit di Next.js Data Cache (Vercel).
 * Invalidate dengan revalidateTag("funnel-stages") setelah admin update.
 */
export const getCachedFunnelStages = unstable_cache(
  () => prisma.funnelStage.findMany(),
  ["funnel-stages"],
  { revalidate: 300, tags: ["funnel-stages"] }
);

/**
 * Config — cached 10 menit, jarang berubah.
 */
export const getCachedConfig = unstable_cache(
  () => prisma.config.findMany(),
  ["global-config"],
  { revalidate: 600, tags: ["global-config"] }
);
