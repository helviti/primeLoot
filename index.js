import puppeteer from "puppeteer";
import { games } from "./games.js";
import fs from "fs";

const scrapedLoot = [];

async function scrapeLoot(game) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(game.url, {
    waitUntil: "networkidle0",
  });
  await page.waitForSelector(".loot-cards");

  const data = await page.evaluate(() => {
    const lootcard = document.querySelector(
      ".loot-card__container:nth-child(1)"
    );
    const img = lootcard.querySelector("img").src;
    const claim = lootcard.querySelector(
      "span[data-a-target=tw-button-text]"
    ).textContent;
    const title = lootcard.querySelector(
      "h2[data-test-selector=LootCardTitle]"
    ).textContent;
    const main = lootcard.querySelector(
      "h3[data-test-selector=LootCardSubtitle]"
    ).textContent;

    return { main, img, claim, title };
  });

  scrapedLoot.push({ name: game.name, ...data, date: Date.now() });

  await browser.close();
}

async function main() {
  let savedLoot;
  fs.readFile("savedLoot.json", "utf8", (err, data) => {
    if (data) {
      savedLoot = JSON.parse(data);
      console.log(savedLoot);
    }
  });

  for (const game of games) {
    await scrapeLoot(game);
  }

  if (savedLoot) {
    for (const game of savedLoot) {
      console.log(`${game.name} found`);
    }
  }

  // save to file
  fs.writeFile(
    "savedLoot.json",
    JSON.stringify(scrapedLoot, null, 4),
    (err) => {
      console.log("Saved scraped loot");
    }
  );

  console.log(JSON.stringify(scrapedLoot));
}

main();
