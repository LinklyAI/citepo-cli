import { useState, useCallback } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Button } from '@ui/button'
import { ChevronDown, Copy, FileText, MessageSquare } from 'lucide-react'

type ContextualOption = 'copy' | 'view' | 'chatgpt' | 'claude'

interface ContextualMenuProps {
  options: ContextualOption[]
}

/**
 * Contextual menu — Copy page as Markdown + dropdown for view/chatgpt/claude.
 * Requires client:load.
 */
export function ContextualMenu({ options }: ContextualMenuProps) {
  const [copied, setCopied] = useState(false)

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
  const mdUrl = currentUrl.replace(/\/?$/, '.md')

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch(mdUrl)
      if (res.ok) {
        const text = await res.text()
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // Fallback: copy the .md URL
      await navigator.clipboard.writeText(mdUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [mdUrl])

  const hasCopy = options.includes('copy')
  const dropdownItems = options.filter((o) => o !== 'copy')

  if (!hasCopy && dropdownItems.length === 0) return null

  return (
    <div className="inline-flex items-center">
      {hasCopy && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={dropdownItems.length > 0 ? 'rounded-r-none border-r-0' : ''}
        >
          <Copy className="size-3.5" />
          {copied ? 'Copied!' : 'Copy Page'}
        </Button>
      )}

      {dropdownItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={hasCopy ? 'rounded-l-none px-2' : ''}
            >
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {dropdownItems.includes('view') && (
              <DropdownMenuItem asChild>
                <a href={mdUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="size-4" />
                  View as Markdown
                </a>
              </DropdownMenuItem>
            )}
            {dropdownItems.includes('chatgpt') && (
              <DropdownMenuItem asChild>
                <a
                  href={`https://chatgpt.com/?q=Read+this+article+and+summarize:+${encodeURIComponent(mdUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquare className="size-4" />
                  Open in ChatGPT
                </a>
              </DropdownMenuItem>
            )}
            {dropdownItems.includes('claude') && (
              <DropdownMenuItem asChild>
                <a
                  href={`https://claude.ai/new?q=Read+this+article+and+summarize:+${encodeURIComponent(mdUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquare className="size-4" />
                  Open in Claude
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
