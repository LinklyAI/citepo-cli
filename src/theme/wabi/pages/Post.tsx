import Footer from '../components/Footer'
import Header from '../components/Header'
import PostNavigation from '../components/PostNavigation'
import TableOfContents from '../components/TableOfContents'
import type { PostPageProps } from '../../theme-types'
import { ContextualMenu } from '@theme/components/ContextualMenu'

export default function Post({
  site,
  post,
  navigation,
  children,
  contextualOptions,
}: PostPageProps) {
  const headings = post.headings ?? []
  const hasHeadings = headings.filter((h) => h.depth >= 2 && h.depth <= 3).length > 0
  const hasContextualMenu = (contextualOptions?.length ?? 0) > 0
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const homeUrl = site.urls?.home ?? (site.basePath === '/' ? '/' : site.basePath)
  const tagsBase =
    site.urls?.tagsBase ?? `${site.basePath === '/' ? '' : site.basePath}/tags`
  const authors = post.authors ?? []
  const tags = post.tags ?? []

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        blogName={site.name}
        logo={site.logo}
        navigation={site.navigation}
        basePath={site.basePath}
        currentLang={site.lang}
        languages={site.languages}
        translations={site.translations}
      />

      <main className="flex-1">
        <div className={`mx-auto px-4 py-12 ${hasHeadings ? 'max-w-5xl' : 'max-w-3xl'}`}>
          <div className={hasHeadings ? 'xl:grid xl:grid-cols-[1fr_200px] xl:gap-8' : undefined}>
            <div className="max-w-3xl">
              <a
                href={homeUrl}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>
                </svg>
                Back to blog
              </a>

              <header className="mb-10">
                <h1 className="post-title mb-4">{post.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <time dateTime={post.dateISO ?? post.date}>{formattedDate}</time>
                  {authors.length > 0 && (
                    <>
                      <span className="text-border">&middot;</span>
                      <span>{authors.join(', ')}</span>
                    </>
                  )}
                  {tags.length > 0 && (
                    <>
                      <span className="text-border">&middot;</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {tags.map((tag) => (
                          <a
                            key={tag}
                            href={`${tagsBase}/${tag}`}
                            className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {tag}
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {hasContextualMenu && (
                  <div className="mt-4">
                    <ContextualMenu options={contextualOptions ?? []} />
                  </div>
                )}
              </header>

              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full rounded-lg mb-10 border border-border"
                />
              )}

              <article className="prose prose-neutral dark:prose-invert max-w-none">
                {children}
              </article>

              <PostNavigation prev={navigation?.prev} next={navigation?.next} />
            </div>

            {hasHeadings && <TableOfContents headings={headings} />}
          </div>
        </div>
      </main>

      <Footer
        blogName={site.name}
        social={site.social}
        resourceLinks={site.resourceLinks}
      />
    </div>
  )
}
