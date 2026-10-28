# blog.json

`blog.json` sits at the project root. `citepo init` creates it. Editors validate it through
the `$schema` URL.

```json
{
  "$schema": "https://cdn.citepo.com/assets/schema.json",
  "name": "My Blog",
  "description": "Notes on building software.",
  "theme": "clean",
  "logo": "/images/logo.png",
  "defaultLanguage": "en",
  "languages": ["en", "zh"],
  "navigation": [{ "label": "Home", "href": "https://example.com" }],
  "social": { "github": "https://github.com/me", "twitter": "https://x.com/me" },
  "seo": { "keywords": ["software"], "ogImage": "/images/share.png" },
  "postsPerPage": 10
}
```

| Field             | Default  | What it does                                                                        |
| ----------------- | -------- | ----------------------------------------------------------------------------------- |
| `name`            | required | Blog name: header, page titles, share cards                                         |
| `description`     | `""`     | Home page description and search snippet                                            |
| `theme`           | `clean`  | `clean` (black and white) or `wabi` (warm reading theme)                            |
| `logo`            |          | Image URL or path under `asset/`; also used as the favicon when there is none       |
| `defaultLanguage` | `en`     | One of `en zh es pt fr de ja ko ru ar`                                              |
| `languages`       |          | All languages, default included; two or more turn on language folders and switching |
| `colors`          |          | `primary`, `background`, `foreground`, `muted`, `accent` as CSS colors              |
| `font`            |          | `sans`, `serif`, `mono` as CSS font-family values                                   |
| `seo`             |          | `title`, `keywords` (list), `ogImage` (site-wide share image)                       |
| `hero`            |          | `image`: banner on the home page                                                    |
| `navigation`      |          | Header links: list of `{ "label", "href" }`                                         |
| `social`          |          | `twitter`, `github`, `linkedin`, `email`                                            |
| `contextual`      |          | `options`: post menu entries from `copy`, `view`, `chatgpt`, `claude`               |
| `basePath`        | `/`      | Sub path the blog is served under, e.g. `/blog`                                     |
| `rss`             | `true`   | Generate `rss.xml`                                                                  |
| `sitemap`         | `true`   | Generate the sitemap (needs the site URL, set by the hosting)                       |
| `llmsText`        | `true`   | Generate `llms.txt` and `llms-full.txt` for AI readers                              |
| `skillMd`         | `true`   | Generate `skill.md`, a guide for AI agents reading the blog                         |
| `postsPerPage`    | `10`     | Posts per list page                                                                 |

Other files at the project root:

- `style.css`: CSS loaded after the theme, for small design changes
- `asset/`: images and files served as they are (`asset/images/a.png` → `/images/a.png`);
  `asset/favicon.svg` or `asset/favicon.ico` is the site icon
