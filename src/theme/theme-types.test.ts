import type { IndexPageProps, ListPageProps, PostPageProps, SiteProps } from './theme-types'

describe('theme props contract', () => {
  const createSite = (): SiteProps => ({
    name: 'Citepo',
    basePath: '/',
    lang: 'en',
  })

  it('accepts minimal site props', () => {
    const site: SiteProps = createSite()
    expectTypeOf(site).toMatchTypeOf<SiteProps>()
  })

  it('accepts index page props with minimal fields', () => {
    const site = createSite()
    const props: IndexPageProps = {
      site,
      posts: [],
    }

    expectTypeOf(props).toMatchTypeOf<IndexPageProps>()
  })

  it('requires list page title', () => {
    const site = createSite()
    // @ts-expect-error title is required for list pages
    const props: ListPageProps = {
      site,
      items: [],
    }
    void props
  })

  it('requires post data for post page', () => {
    const site = createSite()
    // @ts-expect-error post payload is required
    const props: PostPageProps = {
      site,
    }
    void props
  })

  it('accepts post page props with children', () => {
    const site = createSite()
    const props: PostPageProps = {
      site,
      post: {
        title: 'Hello',
        date: '2024-01-01',
      },
      children: 'content',
    }

    expectTypeOf(props).toMatchTypeOf<PostPageProps>()
  })
})
