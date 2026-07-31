"use client"

import { useEffect } from "react"

const blockedText = [
  "Vercel Toolbar",
  "Install the Slack integration",
  "Slack integration",
  "notifications directly in Slack",
  "Vercel",
  "Toolbar",
  "Deployment",
  "GitHub",
  "Deploy Hook",
  "localhost",
  "Next.js"
]

function hideInternalElements() {
  const selectors = [
    "[data-vercel-toolbar]",
    "[data-vercel-inspector]",
    "[data-nextjs-toast]",
    "[data-nextjs-dialog]",
    "[data-nextjs-devtools]",
    "nextjs-portal",
    "vercel-live-feedback",
    "vercel-toolbar",
    "iframe[src*='vercel']",
    "iframe[src*='toolbar']",
    "iframe[src*='feedback']",
    "button[aria-label*='Vercel']",
    "button[title*='Vercel']",
    "div[id*='vercel']",
    "div[class*='vercel']",
    "div[class*='toolbar']"
  ]

  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((element) => {
      ;(element as HTMLElement).style.display = "none"
      ;(element as HTMLElement).style.visibility = "hidden"
      ;(element as HTMLElement).style.pointerEvents = "none"
    })
  }

  document.querySelectorAll("body *").forEach((element) => {
    const text = element.textContent || ""
    if (blockedText.some((term) => text.includes(term))) {
      const htmlElement = element as HTMLElement
      const isStoreContent = htmlElement.closest(".store-shell, .admin-shell, main, header, footer")
      const isSmallWidget = htmlElement.clientWidth < 520 && htmlElement.clientHeight < 240

      if (!isStoreContent || isSmallWidget) {
        htmlElement.style.display = "none"
        htmlElement.style.visibility = "hidden"
        htmlElement.style.pointerEvents = "none"
      }
    }
  })
}

export default function SiteSanitizer() {
  useEffect(() => {
    hideInternalElements()

    const observer = new MutationObserver(() => {
      hideInternalElements()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    const timer = window.setInterval(hideInternalElements, 1200)

    return () => {
      observer.disconnect()
      window.clearInterval(timer)
    }
  }, [])

  return null
}
