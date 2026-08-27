import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * The board pulls roughly three hundred price and history calls from a
   * community API before it can render a single row, which takes over a
   * minute. The default 60s ceiling makes that fail and retry twice before
   * succeeding, so it is raised to something the work actually fits in.
   * Production regeneration runs in the background and is unaffected either
   * way; this only concerns `next build`.
   */
  staticPageGenerationTimeout: 240,
}

export default nextConfig
