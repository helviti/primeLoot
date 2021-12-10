import puppeteer from "puppeteer";

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

page.on("response", async (response) => {
  if (
    response.request().url().includes("nonce") &&
    JSON.parse(response.request().postData()).operationName ===
      "OfferDetail_Journey"
  ) {
    console.log(JSON.parse(await response.text()).data.journey.offers);
  }
});

await page.goto("https://gaming.amazon.com/loot/genshinimpact", {
  waitUntil: "networkidle0",
});

await browser.close();
