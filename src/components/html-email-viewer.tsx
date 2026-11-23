import React, { useRef, useEffect, useState } from 'react';

interface HtmlEmailViewerProps {
  html: string;
  onParagraphClick?: (text: string) => void;
}

export const HtmlEmailViewer: React.FC<HtmlEmailViewerProps> = ({ html, onParagraphClick }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(600);

  // Prepare safe document with isolated styling and external link target
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base target="_blank">
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background-color: #ffffff;
      word-wrap: break-word;
      overflow-wrap: break-word;
      line-height: 1.6;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
    }
    table {
      max-width: 100% !important;
    }
    a {
      color: #1a73e8;
      text-decoration: underline;
    }
    p, h1, h2, h3, h4, h5, h6, li, blockquote {
      cursor: pointer;
      transition: background-color 0.12s ease;
      border-radius: 4px;
    }
    p:hover, h1:hover, h2:hover, h3:hover, li:hover, blockquote:hover {
      background-color: rgba(229, 169, 60, 0.10);
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cleanupClickListener: (() => void) | null = null;

    const setupIframeContent = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        const body = doc.body;
        const htmlEl = doc.documentElement;

        const height = Math.max(
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          htmlEl?.clientHeight || 0,
          htmlEl?.scrollHeight || 0,
          htmlEl?.offsetHeight || 0
        );

        if (height > 50) {
          setIframeHeight(height + 40);
        }

        // Attach paragraph click listener if callback provided
        if (onParagraphClick && body) {
          const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            // Don't intercept actual link navigation
            if (target.closest('a')) return;

            const block = target.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, td');
            const rawText = (block?.textContent || target.textContent || '').trim();
            if (rawText && rawText.length > 5) {
              onParagraphClick(rawText);
            }
          };

          body.addEventListener('click', handleClick);
          cleanupClickListener = () => body.removeEventListener('click', handleClick);
        }
      } catch {
        // Fallback if cross-origin boundary prevents reading
      }
    };

    iframe.addEventListener('load', setupIframeContent);

    let observer: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    try {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        observer = new MutationObserver(setupIframeContent);
        observer.observe(doc.body, { childList: true, subtree: true, attributes: true });

        if (window.ResizeObserver) {
          resizeObserver = new ResizeObserver(setupIframeContent);
          resizeObserver.observe(doc.body);
        }
      }
    } catch {}

    const t1 = setTimeout(setupIframeContent, 300);
    const t2 = setTimeout(setupIframeContent, 1000);
    const t3 = setTimeout(setupIframeContent, 2500);

    return () => {
      iframe.removeEventListener('load', setupIframeContent);
      cleanupClickListener?.();
      observer?.disconnect();
      resizeObserver?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [html, onParagraphClick]);

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white shadow-xl border border-white/10 select-text">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title="Email Body"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        className="w-full border-0 block"
        style={{ height: `${iframeHeight}px` }}
      />
    </div>
  );
};
