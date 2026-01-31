import Footer from '../components/Footer'
import Header from '../components/Header'
import Pagination from '../components/Pagination'
import PostCard from '../components/PostCard'
import type { ListPageProps } from '../../theme-types'

export default function List({ site, title, description, items, pagination, backLink }: ListPageProps) {
  const homeUrl = site.urls?.home ?? (site.basePath === '/' ? '/' : site.basePath)
  const paginationBase =
    site.urls?.paginationBase ?? `${site.basePath === '/' ? '' : site.basePath}/page`

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
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="mb-10 text-center">
            {backLink && (
              <a
                href={backLink.href}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
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
                  <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
                </svg>
                {backLink.label}
              </a>
            )}
            <h1 className="page-title mb-3">{title}</h1>
            {description && <p className="page-description">{description}</p>}
          </div>

          <div className="flex flex-col gap-2">
            {items.map((post) => (
              <PostCard
                key={post.url}
                title={post.title}
                description={post.description ?? ''}
                date={post.date}
                tags={post.tags ?? []}
                slug={post.slug}
                coverImage={post.coverImage}
                url={post.url}
              />
            ))}
          </div>

          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-16">
              No posts found.
            </p>
          )}

          {pagination && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              homeUrl={homeUrl}
              paginationBase={paginationBase}
            />
          )}
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
