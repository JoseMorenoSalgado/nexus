/**
 * Browser-level hydration smoke test for NEXUS.
 *
 * Simulate Safari's rendering engine (WebKit) on CI's seeded localhost site.
 * This test never contacts or modifies production, and catches post-SSR JS
 * crashes which HTML-only and TypeScript checks cannot detect.
 */
import assert from "node:assert/strict";
import {webkit} from "playwright";

const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
const base = new URL(origin);
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname), "WebKit QA must not run against production.");
const routes = [
  "/",
  "/propiedades",
  "/propiedades/casa-zona-ejecutiva",
  "/nosotros",
  "/servicios",
  "/contacto",
  "/asesoria-empresarial"
];
const browser = await webkit.launch({headless:true});
let failures = [];
try {
  for (const [routeIndex, route] of routes.entries()) {
    const context = await browser.newContext({
      viewport: {width:375, height:812},
      deviceScaleFactor:2,
      isMobile:true,
      hasTouch:true,
      reducedMotion: routeIndex % 2 === 0 ? "no-preference" : "reduce"
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push("JS: " + String(error.message).slice(0,300)));
    page.on("console", message => {
      if (message.type() !== "error") return;
      if (/hydration|uncaught|react error|application error/i.test(message.text())) {
        errors.push("Console: " + message.text().slice(0,300));
      }
    });
    page.on("response", response => {
      if (/\/_next\/static\/.+\.js(?:\?|$)/.test(response.url()) && response.status() >= 400)
        errors.push("Chunk: HTTP " + response.status());
    });
    page.on("requestfailed", request => {
      if (/\/_next\/static\/.+\.js(?:\?|$)/.test(request.url()))
        errors.push("Chunk request failed: " + (request.failure()?.errorText || "unknown"));
    });
    try {
      const response = await page.goto(origin + route, {waitUntil:"domcontentloaded", timeout:30000});
      if (response?.status() !== 200) errors.push("HTTP " + response?.status());
      // Observe hydration and initial effects, not only the server-rendered HTML.
      await page.waitForTimeout(1600);
      if (await page.locator("main").count() !== 1) errors.push("Missing main after hydration");
      if (!(await page.locator("main h1").first().isVisible())) errors.push("Heading hidden after hydration");
      if (!(await page.locator(".nexus-header").isVisible())) errors.push("Navigation hidden after hydration");
      if ((await page.locator("body").innerText()).includes("Application error: a client-side exception"))
        errors.push("Next.js client exception overlay");
      if (route === "/") {
        const target = page.locator(".nexus-service-card").first();
        if (await target.count()) {
          await target.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);
        }
      }
      const findings = [...new Set(errors)];
      if (findings.length) {
        failures.push({route, findings});
        console.error("FAIL WebKit " + route + ": " + findings.join("; "));
      } else console.log("OK WebKit " + route + " (hydrated, mobile viewport)");
    } catch(error) {
      failures.push({route,findings: [String(error).slice(0,350),...errors]});
      console.error("FAIL WebKit " + route + " " + String(error).slice(0,350));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures,[], "Safari/WebKit client runtime regressions detected");
console.log("NEXUS WebKit hydration: all " + routes.length + " public routes passed.");
