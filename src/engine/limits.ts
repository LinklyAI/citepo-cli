/**
 * Limits of the hosted CitePo build. Local builds are not limited, but a site that
 * exceeds these fails to deploy, so `build` and `check` warn about them.
 */
export const HOSTED_LIMITS = {
  /** Total size of the build output. */
  outputBytes: 100 * 1024 * 1024,
  /** Size of a single output file. */
  fileBytes: 20 * 1024 * 1024,
  /** Size of the repository archive downloaded by the builder. */
  repoBytes: 100 * 1024 * 1024,
} as const

/** Warn once the output reaches this share of the limit. */
export const LIMIT_WARNING_RATIO = 0.8
