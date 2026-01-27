/**
 * Pagination utility for splitting posts into pages.
 */

export interface PaginationResult<T> {
  items: T[]
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}

/** Paginate an array of posts */
export function paginatePosts<T>(posts: T[], page: number, perPage: number): PaginationResult<T> {
  const totalPages = Math.max(1, Math.ceil(posts.length / perPage))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * perPage
  const items = posts.slice(start, start + perPage)

  return {
    items,
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  }
}

/** Generate static paths for pagination pages 2..N */
export function generatePaginationPaths(totalItems: number, perPage: number): number[] {
  const totalPages = Math.ceil(totalItems / perPage)
  const pages: number[] = []
  for (let i = 2; i <= totalPages; i++) {
    pages.push(i)
  }
  return pages
}
