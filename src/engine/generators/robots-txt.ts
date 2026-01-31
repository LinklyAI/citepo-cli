/**
 * Generate robots.txt content.
 * Includes Sitemap directive only when siteUrl is provided.
 */
export function generateRobotsTxt(siteUrl?: string, basePath?: string): string {
  const lines = ['User-agent: *', 'Allow: /']

  if (siteUrl) {
    const normalizedSiteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl
    const normalizedBasePath = basePath && basePath !== '/'
      ? (basePath.startsWith('/') ? basePath : `/${basePath}`).replace(/\/+$/, '')
      : ''
    lines.push('', `Sitemap: ${normalizedSiteUrl}${normalizedBasePath}/sitemap-index.xml`)
  }

  return lines.join('\n') + '\n'
}
