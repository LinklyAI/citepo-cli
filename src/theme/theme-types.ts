import type { ReactNode } from 'react'

export type NavigationItem = {
  label: string
  href: string
  external?: boolean
}

export type SocialLinks = {
  twitter?: string
  github?: string
  linkedin?: string
  email?: string
}

export type SiteProps = {
  name: string
  description?: string
  logo?: string
  basePath: string
  lang: string
  languages?: string[]
  translations?: Record<string, string>
  navigation?: NavigationItem[]
  social?: SocialLinks
  resourceLinks?: {
    rss?: string
    llms?: string
    llmsFull?: string
    skill?: string
  }
  urls?: {
    home: string
    tagsBase?: string
    paginationBase?: string
  }
}

export type PaginationProps = {
  currentPage: number
  totalPages: number
}

export type Heading = {
  depth: number
  slug: string
  text: string
}

export type PostLink = {
  title: string
  url: string
}

export type PostSummary = {
  title: string
  description?: string
  url: string
  slug: string
  date: string
  dateISO?: string
  tags?: string[]
  authors?: string[]
  coverImage?: string
}

export type IndexPageProps = {
  site: SiteProps
  hero?: {
    title?: string
    subtitle?: string
    image?: string
    ctaLabel?: string
    ctaHref?: string
  }
  posts: PostSummary[]
  pagination?: PaginationProps
}

export type ListPageProps = {
  site: SiteProps
  title: string
  description?: string
  items: PostSummary[]
  pagination?: PaginationProps
  backLink?: {
    href: string
    label: string
  }
}

export type PostPageProps = {
  site: SiteProps
  post: {
    title: string
    description?: string
    date: string
    dateISO?: string
    tags?: string[]
    authors?: string[]
    coverImage?: string
    headings?: Heading[]
  }
  navigation?: {
    prev?: PostLink
    next?: PostLink
  }
  contextualOptions?: Array<'copy' | 'view' | 'chatgpt' | 'claude'>
  children?: ReactNode
}
