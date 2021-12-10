import puppeteer from "puppeteer";
import { games } from "./games.js";
import fs from "fs";

async function main() {
  const responses = [];
  const availableOffers = [];
  let savedLoot;

  fs.readFile("savedLoot.json", "utf8", (err, data) => {
    if (data) {
      savedLoot = JSON.parse(data);
    }
  });

  class Game {
    constructor(name) {
      this.name = name;
      this.offers = [];
    }
  }

  class Offer {
    constructor(id, startTime, endTime, subtitle, img, content) {
      this.id = id;
      this.startTime = startTime;
      this.endTime = endTime;
      this.subtitle = subtitle;
      this.img = img;
      this.content = Array.from(content.map((item) => item.alt));
    }
  }

  for (const game of games) {
    availableOffers.push(new Game(game.name));
  }

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on("response", async (response) => {
      if (
        response.request().url().includes("nonce") &&
        JSON.parse(response.request().postData()).operationName ===
          "OfferDetail_Journey"
      ) {
        responses.push(JSON.parse(await response.text()).data.journey);
      }
    });

    async function scrapeLoot(game) {
      await page.goto(game.url, {
        waitUntil: "networkidle0",
      });
    }

    for (const game of games) {
      await scrapeLoot(game);
    }

    await browser.close();

    for (const response of responses) {
      for (const offer of response.offers) {
        if (offer.self.claimStatus === "AVAILABLE") {
          availableOffers[
            availableOffers.findIndex((el) => el.name === response.assets.title)
          ].offers.push(
            new Offer(
              offer.id,
              offer.startTime,
              offer.endTime,
              offer.assets.subtitle,
              offer.assets.card.defaultMedia.src1x,
              offer.assets.additionalMedia
            )
          );
        }
      }
    }

    console.log(`Available offers: ${availableOffers.length}`);

    fs.writeFile(
      "savedLoot.json",
      JSON.stringify(availableOffers, null, 4),
      (err) => {
        console.log("Saved scraped loot");
      }
    );
  } catch (err) {
    console.log(err);
  }
}

main();
