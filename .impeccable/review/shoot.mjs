// Batched review capture for the Chart Room build (V4). Not app code.
// Run against `pnpm build && pnpm start -p 3200`:
//   NP=$(npm root -g) node .impeccable/review/shoot.mjs .impeccable/review
// Uses the Playwright install that ships on the VM (see BUILD_LOG V0).
import { createRequire } from "module";
const require = createRequire(process.env.NP + "/");
const { chromium } = require("playwright");

const BASE = process.env.BASE ?? "http://localhost:3200";
const OUT = process.argv[2] ?? ".impeccable/review";
const VIEWPORTS = [
  { w: 390, h: 844, tag: "mobile" },
  { w: 1440, h: 900, tag: "desktop" },
];
const b = await chromium.launch();
const problems = [];

async function context(vp, { player = true, theme = null, relaxed = false, reducedMotion = "no-preference" } = {}) {
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2, reducedMotion });
  await ctx.addInitScript(
    ({ player, theme, relaxed, id }) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      if (player) localStorage.setItem("hexathlon:player", JSON.stringify({ id, nickname: "Chartwell" }));
      if (theme) localStorage.setItem("hexathlon:theme", theme);
      if (relaxed) localStorage.setItem("hexathlon:settings", JSON.stringify({ relaxed: true }));
    },
    { player, theme, relaxed, id: `review-${vp.tag}-${Math.random().toString(36).slice(2, 10)}` },
  );
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${vp.tag}: ${e.message}`));
  return { ctx, page };
}

async function shot(page, name, vp, full = true) {
  // Let entrance motion settle so nothing is caught mid-animation.
  await page.waitForTimeout(900);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > vp.w) problems.push(`${name}-${vp.tag}: horizontal scroll ${sw}px`);
  await page.screenshot({ path: `${OUT}/${name}-${vp.tag}.png`, fullPage: full });
}

const click = (page, name) => page.getByRole("button", { name }).first().click();

async function startRun(page, path, button) {
  await page.goto(BASE + path);
  await page.waitForTimeout(1200);
  await click(page, button);
}

for (const vp of VIEWPORTS) {
  // Home, first visit (no nickname asked) and returning.
  {
    const { ctx, page } = await context(vp, { player: false });
    await page.goto(BASE + "/");
    await shot(page, "home-first-visit", vp);
    await ctx.close();
  }
  {
    const { ctx, page } = await context(vp);
    await page.goto(BASE + "/");
    await shot(page, "home", vp);
    // First viewport only: the thumb-zone action must be on screen.
    if (vp.tag === "mobile") await shot(page, "home-viewport", vp, false);

    // Intro with the time limits.
    await page.goto(BASE + "/play/pip-flash/rush");
    await shot(page, "intro-pip-flash", vp);

    // Lead play screen: Pip Flash mid-sweep.
    await click(page, /Start Rush/);
    await page.waitForTimeout(2400);
    await page.screenshot({ path: `${OUT}/${vp.tag}.png`, fullPage: true });
    // Verdict: a buoy on the chosen corner.
    await page.keyboard.press("b");
    await shot(page, "play-pip-flash-verdict", vp);
    await ctx.close();
  }
  {
    const { ctx, page } = await context(vp);
    await startRun(page, "/play/port-math/rush", /Start Rush/);
    await page.waitForTimeout(900);
    const give = page.locator('button[aria-label^="Trade away"]:not([disabled])').first();
    if (await give.count()) {
      await give.click();
      await page.waitForTimeout(200);
      await page.locator('button[aria-label^="Get 1"]').first().click();
    }
    await shot(page, "play-port-math", vp);
    await click(page, /^Skip$/);
    await shot(page, "play-port-math-skip-confirm", vp);
    await ctx.close();
  }
  {
    const { ctx, page } = await context(vp);
    await startRun(page, "/play/hand-tracker/rush", /Start Rush/);
    await page.waitForTimeout(5200);
    await shot(page, "play-hand-tracker-log", vp);
    await page.waitForSelector('section[aria-label="Question"]', { timeout: 90_000 });
    await page.keyboard.press("3");
    await shot(page, "play-hand-tracker-pad", vp);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    await click(page, /^Pause/);
    await shot(page, "play-paused", vp);
    await ctx.close();
  }
  // Rush result with a real combo. Pin the Rush seed, learn the answers in a
  // first pass, then sail it answering 4 right in a row (combo Fl(4)).
  {
    const pin = (ctx) =>
      ctx.addInitScript(() => {
        const orig = crypto.getRandomValues.bind(crypto);
        crypto.getRandomValues = (a) => {
          if (a instanceof Uint32Array && a.length === 1) {
            a[0] = 424242;
            return a;
          }
          return orig(a);
        };
      });
    const answers = [];
    {
      const { ctx, page } = await context(vp);
      await pin(ctx);
      await startRun(page, "/play/pip-flash/rush", /Start Rush/);
      for (let i = 0; i < 13; i++) {
        await page.waitForTimeout(800);
        await page.keyboard.press("a");
        await page.waitForTimeout(350);
        const detail = await page.locator('[role="status"]').first().innerText();
        answers.push((detail.match(/\b([A-F]) ha[sd]\b/) ?? [])[1] ?? "a");
        const next = page.getByRole("button", { name: /^(Next|See results)/ });
        if (await next.count()) await next.first().click();
        else await page.waitForTimeout(1300);
      }
      await ctx.close();
    }
    const { ctx, page } = await context(vp);
    await pin(ctx);
    await startRun(page, "/play/pip-flash/rush", /Start Rush/);
    for (let i = 0; i < 13; i++) {
      await page.waitForTimeout(800);
      // Right for the first 9, then a couple of misses for the replay.
      const key = i < 9 || i === 11 ? answers[i] : answers[i] === "A" ? "b" : "a";
      await page.keyboard.press(key.toLowerCase());
      await page.waitForTimeout(350);
      if (i === 3) await shot(page, "play-run-header", vp, false);
      const next = page.getByRole("button", { name: /^(Next|See results)/ });
      if (await next.count()) await next.first().click();
      else await page.waitForTimeout(1300);
    }
    await page.waitForTimeout(1500);
    const see = page.getByRole("button", { name: /See results/ });
    if (await see.count()) await see.click();
    await page.waitForTimeout(2500);
    await shot(page, "result-rush", vp);
    // The challenge's share card: needs the saved result (dev database).
    if (vp.tag === "mobile") {
      const make = page.getByRole("button", { name: /challenge link/ });
      if (await make.count()) {
        await make.click();
        await page.waitForTimeout(2500);
        const url = (await page.locator("output").first().innerText()).trim();
        const m = url.match(/\/c\/([A-Za-z0-9]+)/);
        if (m) {
          const res = await page.request.get(`${BASE}/c/${m[1]}/opengraph-image`);
          (await import("fs")).writeFileSync(`${OUT}/share-card-challenge.png`, await res.body());
        } else problems.push(`no challenge link: ${url}`);
      }
    }
    await ctx.close();
  }
  // Daily without a nickname: asked at the first scored submit; then already-played.
  {
    const { ctx, page } = await context(vp, { player: false });
    await startRun(page, "/play/port-math/daily", /Sail today/);
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(900);
      await click(page, /^Skip/);
      await click(page, /Tap again/);
      await page.waitForTimeout(300);
      await click(page, /^(Next|See results)/);
    }
    await page.waitForTimeout(1200);
    await shot(page, "result-daily-nickname", vp);
    await page.getByLabel("Nickname").fill("Chartwell");
    await click(page, "Save");
    await page.waitForTimeout(2500);
    await page.goto(BASE + "/play/port-math/daily");
    await shot(page, "daily-already-played", vp);
    await page.goto(BASE + "/");
    await shot(page, "home-after-daily", vp);
    await ctx.close();
  }
  // Relaxed mode: intro and the tap-paced log.
  {
    const { ctx, page } = await context(vp, { relaxed: true });
    await page.goto(BASE + "/play/hand-tracker/rush");
    await shot(page, "intro-relaxed", vp);
    await click(page, /Start Rush/);
    await page.waitForTimeout(1200);
    await click(page, /Start the log/);
    await shot(page, "play-hand-tracker-relaxed", vp);
    await ctx.close();
  }
  // Dusk and night palettes.
  for (const theme of ["dusk", "night"]) {
    const { ctx, page } = await context(vp, { theme });
    await page.goto(BASE + "/");
    await shot(page, `home-${theme}`, vp);
    await startRun(page, "/play/pip-flash/rush", /Start Rush/);
    await page.waitForTimeout(2400);
    await page.keyboard.press("c");
    await shot(page, `play-pip-flash-${theme}`, vp);
    await ctx.close();
  }
  // Reduced motion: the stepped range ring.
  {
    const { ctx, page } = await context(vp, { reducedMotion: "reduce" });
    await startRun(page, "/play/pip-flash/rush", /Start Rush/);
    await page.waitForTimeout(2600);
    await shot(page, "play-pip-flash-reduced-motion", vp);
    await ctx.close();
  }
  // Challenge not found, and a 404.
  {
    const { ctx, page } = await context(vp);
    await page.goto(BASE + "/c/unknown123");
    await page.waitForTimeout(1500);
    await shot(page, "challenge-unknown", vp);
    await page.goto(BASE + "/no-such-page");
    await shot(page, "not-found", vp);
    await ctx.close();
  }
}

// Share card.
{
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  const res = await page.goto(BASE + "/opengraph-image");
  if (res) (await import("fs")).writeFileSync(`${OUT}/share-card.png`, await res.body());
  await ctx.close();
}

await b.close();
console.log(problems.length ? `Problems:\n${problems.join("\n")}` : "No page errors, no horizontal scroll.");
