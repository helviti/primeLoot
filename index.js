import puppeteer from "puppeteer";
import { games } from "./games.js";
import fs from "fs";

async function main() {
  const responses = [];
  const availableOffers = [];

  class Offer {
    constructor(id, game, startTime, endTime, subtitle, img, content) {
      this.id = id;
      this.game = game;
      this.startTime = startTime;
      this.endTime = endTime;
      this.subtitle = subtitle;
      this.img = img;
      this.content =
        content.length === 0 ? [] : Array.from(content.map((item) => item.alt));
    }
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

    for (const game of games) {
      await page.goto(game.url, {
        waitUntil: "networkidle0",
      });
    }

    await browser.close();

    for (const response of responses) {
      for (const offer of response.offers) {
        if (offer.self.claimStatus === "AVAILABLE") {
          availableOffers.push(
            new Offer(
              offer.id,
              response.assets.title,
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

    // Compare to saved file
    let savedLoot;

    try {
      savedLoot = JSON.parse(fs.readFileSync("savedLoot.json", "utf8"));
    } catch (err) {
      console.error(err);
    }

    if (savedLoot) {
      for (const offer of availableOffers) {
        if (!savedLoot.map((el) => el.id).includes(offer.id)) {
        } else {
          console.log(offer);
        }
      }
    } else {
      console.log("No saved loot found");
      for (const offer of availableOffers) {
        console.log(offer);
      }
    }

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
