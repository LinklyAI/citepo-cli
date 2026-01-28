/// <reference types="astro/client" />

declare module 'virtual:blog-config' {
  import type { BlogConfig } from '../../engine/config.js'
  const config: BlogConfig & { siteUrl?: string }
  export default config
}

declare module '@mdx' {
  export const Callout: typeof import('../../mdx-components/Callout.js').Callout
  export const Card: typeof import('../../mdx-components/Card.js').Card
  export const CardGroup: typeof import('../../mdx-components/CardGroup.js').CardGroup
  export const Accordion: typeof import('../../mdx-components/Accordion.js').Accordion
  export const AccordionGroup: typeof import('../../mdx-components/AccordionGroup.js').AccordionGroup
  export const Badge: typeof import('../../mdx-components/Badge.js').Badge
  export const CodeGroup: typeof import('../../mdx-components/CodeGroup.js').CodeGroup
  export const Steps: typeof import('../../mdx-components/Steps.js').Steps
  export const Step: typeof import('../../mdx-components/Steps.js').Step
}
