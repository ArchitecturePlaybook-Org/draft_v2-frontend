"use client";

import { useEffect } from "react";

export function InitClientScripts() {
  useEffect(() => {
    // 1. Performance Polyfill
    if (typeof window !== "undefined" && window.performance) {
      try {
        const origMeasure = window.performance.measure;
        window.performance.measure = function (...args: any[]) {
          try {
            if (
              typeof args[0] === "string" &&
              (args[0].includes("ProjectsPage") || args[0].includes("DashboardPage"))
            ) {
              return null as any;
            }
            return origMeasure.apply(this, args as any);
          } catch (e) {
            return null as any;
          }
        };

        const origMark = window.performance.mark;
        window.performance.mark = function (...args: any[]) {
          try {
            return origMark.apply(this, args as any);
          } catch (e) {
            return null as any;
          }
        };
      } catch (e) {}
    }

    // 2. Service Worker Registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").then(
          (reg) => {
            console.log("ServiceWorker registration successful with scope: ", reg.scope);
          },
          (err) => {
            console.log("ServiceWorker registration failed: ", err);
          }
        );
      });
    }
  }, []);

  return null;
}
