const puppeteer = require("puppeteer");
const { urls } = require("./config.js");
const fs = require("fs");

class Offer {
  constructor(id, game, startTime, endTime, subtitle, img, content, url) {
    this.id = id;
    this.game = game;
    this.startTime = startTime;
    this.endTime = endTime;
    this.subtitle = subtitle;
    this.img = img;
    this.content =
      content.length === 0 ? [] : Array.from(content.map((item) => item.alt));
    this.url = url;
  }
}

class Response {
  constructor(url, data) {
    this.url = url;
    this.data = data;
  }
}

async function main() {
  const newLoot = [];
  const responses = [];
  const availableOffers = [];

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on("response", async (response) => {
    if (
      response.request().url().includes("nonce") &&
      JSON.parse(response.request().postData()).operationName ===
        "OfferDetail_Journey"
    ) {
      console.log(page.url());
      responses.push(
        new Response(page.url(), JSON.parse(await response.text()).data.journey)
      );
    }
  });

  try {
    for (const url of urls) {
      await page.goto(url, {
        waitUntil: "networkidle0",
      });
    }

    await browser.close();

    for (const response of responses) {
      console.log(response);
      for (const offer of response.data.offers) {
        if (offer.self.claimStatus === "AVAILABLE") {
          availableOffers.push(
            new Offer(
              offer.id,
              response.data.assets.title,
              offer.startTime,
              offer.endTime,
              offer.assets.subtitle,
              offer.assets.card.defaultMedia.src1x,
              offer.assets.additionalMedia,
              response.url
            )
          );
        }
      }
    }

    // Compare to saved file
    let savedLoot;

    try {
      if (fs.existsSync("savedLoot.json")) {
        try {
          savedLoot = JSON.parse(fs.readFileSync("savedLoot.json", "utf8"));
        } catch (err) {
          // console.error(err);
        }
      }
    } catch (err) {
      // console.error(err);
    }

    if (savedLoot) {
      for (const offer of availableOffers) {
        if (!savedLoot.map((el) => el.id).includes(offer.id)) {
          newLoot.push(offer);
        }
      }
    } else {
      // console.log("No saved loot found");
      for (const offer of availableOffers) {
        newLoot.push(offer);
      }
    }

    fs.writeFile(
      "savedLoot.json",
      JSON.stringify(availableOffers, null, 4),
      (err) => {
        // console.log("Saved scraped loot");
      }
    );
  } catch (err) {
    console.log(err);
  }
  // console.log(`${newLoot.length} new offers`);
}

main();

module.exports = main;
