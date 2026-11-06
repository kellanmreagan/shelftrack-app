import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4173/shelftrack-app/";
const out = process.env.SHOT_DIR ?? "/tmp/shelftrack-shots";
const chrome = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
mkdirSync(out, { recursive: true });

const problems = [];

function note(message) {
  problems.push(message);
  console.error("PROBLEM:", message);
}

async function shot(page, name) {
  await page.screenshot({ path: `${out}/${name}.png` });
}

async function walk(browser, viewport, label) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: label === "mobile" ? 2 : 1,
    hasTouch: label === "mobile",
  });
  const page = await context.newPage();
  const logs = [];
  page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") logs.push(`console: ${msg.text()}`);
  });

  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Catalog", level: 1 }).waitFor();
  await shot(page, `${label}-catalog`);
  await page.getByRole("button", { name: "Year and wave" }).click();
  await page.locator("#year-wave-filters select").first().selectOption("1978");
  await page.locator(".result-count", { hasText: "20 figures" }).waitFor();
  await shot(page, `${label}-year-1978`);
  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator(".result-count", { hasText: "343 figures" }).waitFor();

  await page.getByRole("link", { name: "Collection" }).click();
  await page.getByRole("heading", { name: "Your shelf is clear" }).waitFor();
  await shot(page, `${label}-collection-empty`);

  await page.getByRole("link", { name: "Wishlist" }).click();
  await page.getByRole("heading", { name: "No hunts yet" }).waitFor();
  await shot(page, `${label}-wishlist-empty`);

  await page.getByRole("link", { name: /Pro/ }).click();
  const proButton = page.getByRole("button", { name: "Pro is not available yet" });
  if (await proButton.isEnabled()) note(`${label}: Pro button is enabled`);
  await shot(page, `${label}-pro`);

  await page.getByRole("link", { name: "Catalog" }).click();
  await page.getByRole("button", { name: "Scan" }).click();
  await page.getByRole("heading", { name: "Barcode scan" }).waitFor();
  await shot(page, `${label}-barcode`);
  await page.getByRole("button", { name: "Go to search" }).click();
  await page.locator("#catalog-search").waitFor();

  const search = page.locator("#catalog-search");
  await search.fill("VC304");
  await page.getByText("1 figure", { exact: true }).waitFor();
  await shot(page, `${label}-search-vc304`);
  const card = page.locator('[data-figure-id="the-vintage-collection-VC304-2024"]');
  await card.getByRole("button", { name: "Add Chopper (C1-10P) to collection" }).click();
  await page.getByText("Added Chopper (C1-10P) to your collection").waitFor();
  await shot(page, `${label}-toast-add`);

  await card.getByRole("button", { name: /Chopper \(C1-10P\)/ }).first().click();
  await page.getByRole("heading", { name: "Chopper (C1-10P)" }).waitFor();
  await page.getByText("Generated catalog plate").waitFor();
  await shot(page, `${label}-detail`);

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC",
    "base64",
  );
  writeFileSync("/tmp/shelftrack-user.png", png);
  await page.locator('input[aria-label="Upload a photo of Chopper (C1-10P)"]').setInputFiles("/tmp/shelftrack-user.png");
  await page.getByText("Photo saved on this device").waitFor();
  await page.getByRole("dialog").getByText("Your photo", { exact: true }).waitFor();
  await shot(page, `${label}-photo`);
  await page.getByRole("button", { name: "Remove photo" }).click();
  await page.getByText("Removed your photo").waitFor();
  await page.getByText("Generated catalog plate").waitFor();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("radio", { name: "Carded" }).click();
  await page.getByRole("checkbox", { name: /Accessories complete/ }).uncheck();
  await page.getByLabel("Location").fill("Desk bin");
  await page.getByLabel("Notes").fill("Bubble is cloudy");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved changes").waitFor();
  await page.getByRole("button", { name: "Close Chopper (C1-10P)" }).click();

  await page.getByRole("link", { name: /Collection/ }).click();
  await page.getByText("Carded").first().waitFor();
  await page.getByText("Accessories missing").waitFor();
  await page.getByText("Desk bin").waitFor();
  await shot(page, `${label}-collection`);
  await page.locator(".stat", { hasText: "Missing" }).click();
  await page.getByText("Chopper (C1-10P)").waitFor();
  await page.getByLabel("Sort").selectOption("name");
  await shot(page, `${label}-collection-filtered`);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Desk bin").waitFor();

  await page.getByRole("link", { name: "Catalog" }).click();
  await search.fill("Boba Fett");
  await page.getByRole("button", { name: /Save .* to wishlist/ }).first().click();
  await page.getByText(/Saved .* to wishlist/).waitFor();
  await page.getByRole("link", { name: /Wishlist/ }).click();
  await page.getByRole("button", { name: "Add to collection" }).first().click();
  await page.getByRole("button", { name: "Add to collection" }).last().click();
  await page.getByText(/Moved .* into your collection/).waitFor();
  await page.getByRole("heading", { name: "No hunts yet" }).waitFor();
  await shot(page, `${label}-wishlist-after-acquire`);

  await page.getByRole("link", { name: /Collection/ }).click();
  await page.getByRole("button", { name: "Remove" }).first().click();
  await page.locator(".toast", { hasText: "Removed" }).getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Remove" }).first().waitFor();

  await page.getByRole("button", { name: "Settings" }).click();
  await shot(page, `${label}-settings`);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const backupPath = `/tmp/shelftrack-backup-${label}.json`;
  await download.saveAs(backupPath);

  await page.getByRole("button", { name: "Reset this device" }).click();
  await page.getByRole("button", { name: "Delete local data" }).click();
  await page.getByRole("link", { name: /Collection/ }).click();
  await page.getByRole("heading", { name: "Your shelf is clear" }).waitFor();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('input[accept="application/json,.json"]').setInputFiles(backupPath);
  await page.getByRole("button", { name: "Replace data on this device" }).click();
  await page.getByText("Backup restored on this device").waitFor();
  await page.getByRole("link", { name: /Collection/ }).click();
  await page.getByText("Desk bin").waitFor();
  await shot(page, `${label}-after-import`);

  await page.getByRole("link", { name: "Catalog" }).click();
  await page.getByRole("link", { name: "Image policy and sources" }).click();
  await page.getByRole("heading", { name: "Credits" }).waitFor();
  await page.getByText("Permitted real product images: 0").waitFor();
  await shot(page, `${label}-credits`);

  if (logs.length) note(`${label} console/page errors:\n${logs.join("\n")}`);
  await context.close();
}

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  await walk(browser, { width: 390, height: 844 }, "mobile");
  await walk(browser, { width: 1280, height: 800 }, "desktop");
} catch (error) {
  note(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  await browser.close();
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log("Walkthrough passed");
