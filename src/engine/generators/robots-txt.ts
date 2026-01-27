/**
 * Generate robots.txt content.
 * Includes Sitemap directive only when siteUrl is provided.
 */
export function generateRobotsTxt(siteUrl?: string): string {
  const lines = ['User-agent: *', 'Allow: /']

  if (siteUrl) {
    lines.push('', `Sitemap: ${siteUrl}/sitemap-index.xml`)
  }

  return lines.join('\n') + '\n'
}
