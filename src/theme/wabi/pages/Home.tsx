import Footer from '../components/Footer'
import Header from '../components/Header'
import HeroBanner from '../components/HeroBanner'
import Pagination from '../components/Pagination'
import PostCard from '../components/PostCard'
import type { IndexPageProps } from '../../theme-types'

export default function Home({ site, hero, posts, pagination }: IndexPageProps) {
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
          <HeroBanner image={hero?.image} alt={site.name} />

          <div className="text-center mb-12">
            <h1 className="page-title mb-3">{site.name}</h1>
            {site.description && (
              <p className="page-description">{site.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {posts.map((post) => (
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

          {posts.length === 0 && (
            <p className="text-center text-muted-foreground py-16">
              No posts yet. Create your first post in the <code>content/</code> directory.
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
