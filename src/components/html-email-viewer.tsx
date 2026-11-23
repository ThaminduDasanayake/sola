import React, { useRef, useEffect, useState } from 'react';

interface HtmlEmailViewerProps {
  html: string;
}

export const HtmlEmailViewer: React.FC<HtmlEmailViewerProps> = ({ html }) => {
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
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background-color: #ffffff;
      word-wrap: break-word;
      overflow-wrap: break-word;
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

    const updateHeight = () => {
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
      } catch {
        // Fallback if cross-origin boundary prevents reading
      }
    };

    iframe.addEventListener('load', updateHeight);

    let observer: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    try {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        observer = new MutationObserver(updateHeight);
        observer.observe(doc.body, { childList: true, subtree: true, attributes: true });

        if (window.ResizeObserver) {
          resizeObserver = new ResizeObserver(updateHeight);
          resizeObserver.observe(doc.body);
        }
      }
    } catch {}

    const t1 = setTimeout(updateHeight, 300);
    const t2 = setTimeout(updateHeight, 1000);
    const t3 = setTimeout(updateHeight, 2500);

    return () => {
      iframe.removeEventListener('load', updateHeight);
      observer?.disconnect();
      resizeObserver?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [html]);

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
