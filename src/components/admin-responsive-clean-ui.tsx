"use client";

import { useEffect } from "react";

function getDeviceMode() {
  if (typeof window === "undefined") return "desktop";

  const width = window.innerWidth || 1200;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

  if (width <= 768 || coarse || mobileUA) return "mobile";
  return "desktop";
}

export default function AdminResponsiveCleanUI() {
  useEffect(() => {
    function applyMode() {
      const mode = getDeviceMode();

      document.documentElement.setAttribute("data-exale-admin-device", mode);
      document.body.setAttribute("data-exale-admin-device", mode);
      document.body.classList.add("exale-admin-clean-ui");
    }

    applyMode();

    window.addEventListener("resize", applyMode);
    window.addEventListener("orientationchange", applyMode);

    return () => {
      window.removeEventListener("resize", applyMode);
      window.removeEventListener("orientationchange", applyMode);
    };
  }, []);

  return (
    <style jsx global>{`
      body.exale-admin-clean-ui {
        overflow-x: hidden;
      }

      body.exale-admin-clean-ui [data-exale-admin-floating],
      body.exale-admin-clean-ui [data-exale-format-floating],
      body.exale-admin-clean-ui [data-exale-sync-floating],
      body.exale-admin-clean-ui [data-exale-old-floating-actions] {
        display: none !important;
      }

      body.exale-admin-clean-ui #exale-admin-products-inline-panel {
        max-width: 1120px;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] {
        background: #fff7e6;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] main,
      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] section,
      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] article {
        max-width: 100%;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] h1 {
        font-size: clamp(42px, 13vw, 72px) !important;
        line-height: 0.98 !important;
        letter-spacing: -0.04em !important;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] h2,
      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] h3 {
        font-size: clamp(28px, 8vw, 44px) !important;
        line-height: 1.05 !important;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] button,
      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] a {
        -webkit-tap-highlight-color: transparent;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] #exale-admin-products-inline-panel {
        margin-top: 18px !important;
        padding: 14px !important;
        border-radius: 24px !important;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] #exale-admin-products-inline-panel article {
        grid-template-columns: 86px 1fr !important;
        gap: 12px !important;
        padding: 12px !important;
        border-radius: 22px !important;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="mobile"] #exale-admin-products-inline-panel img {
        width: 86px !important;
        height: 86px !important;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="desktop"] #exale-admin-products-inline-panel {
        padding: 22px !important;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="desktop"] #exale-admin-products-inline-panel > div:last-child {
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)) !important;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="desktop"] #exale-admin-products-inline-panel article {
        grid-template-columns: 96px 1fr !important;
        min-height: 132px !important;
      }

      body.exale-admin-clean-ui[data-exale-admin-device="desktop"] #exale-admin-products-inline-panel img {
        width: 96px !important;
        height: 96px !important;
      }

      @media (max-width: 480px) {
        body.exale-admin-clean-ui #exale-admin-products-inline-panel {
          width: calc(100vw - 36px) !important;
        }

        body.exale-admin-clean-ui #exale-admin-products-inline-panel article {
          grid-template-columns: 78px 1fr !important;
        }

        body.exale-admin-clean-ui #exale-admin-products-inline-panel img {
          width: 78px !important;
          height: 78px !important;
        }
      }
    `}</style>
  );
}
