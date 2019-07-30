import * as Cheerio from "cheerio";
import * as crypto from "crypto";
import {
  AddToQueue,
  appInfo,
  FromQueue,
  Job,
  OnStart,
  RequestUtil,
} from "ppspider";

const categories = [
  "the-gioi",
];

function md5(text: string) {
  return crypto.createHash("md5").update(Buffer.from(text)).digest("hex");
}

export class VNExpressTask {

  @OnStart({
    urls: "https://vnexpress.net/",
  })
  @AddToQueue({ name: "vnexpress_topics" })
  public async getQuotes(job: Job) {

    const topics: string[] = [];
    categories.forEach((x) => {
      topics.push(job.url + x);
    });

    return topics;

  }

  @FromQueue({
    name: "vnexpress_topics",
    exeInterval: 0,
  })
  @AddToQueue([
    { name: "vnexpress_topics" },
    { name: "vnexpress_articles" },
  ])
  public async fromQueue(job: Job) {
    const htmlRes = await RequestUtil.simple({ url: job.url });
    const $ = Cheerio.load(htmlRes.body);

    const articles = $("body section.sidebar_1 > article > h4 > a:first-child").map((index, element) => {
      const $quoteEle = $(element);
      return $quoteEle.attr("href");
    }).get();

    // load more page?

    return {
      vnexpress_topics: [],
      vnexpress_articles: articles,
    };
  }

  @FromQueue({
    name: "vnexpress_articles",
    exeInterval: 0,
  })
  public async scrape(job: Job) {
    console.log("Read: " + job.url);

    const htmlRes = await RequestUtil.simple({ url: job.url });
    const $ = Cheerio.load(htmlRes.body);

    const article = {
      _id: md5(job.url),
      url: job.url,
      time: $("section.container header > span.time").text(),
      title: $("h1.title_news_detail").text(),
      description: $("p.description").text(),
      author_name: $("article.content_detail > p:last-child > strong").text(),
      author_credit: $("article.content_detail > p:last-child").text(),
      author_mail: $("body > section.container > section.wrap_sidebar_12 > section.sidebar_1 > p.author_mail").text(),
      box_brief_info: $("body > section.container > section.wrap_sidebar_12 > section.sidebar_1 > article > .box_brief_info p").text(),
      contents: $("body > section.container > section.wrap_sidebar_12 > section.sidebar_1 > article > p:not(.author_mail), table").map((i, e) => {
        if (e.tagName === "table") {
          const img = $(e).find("tbody > tr:nth-child(1) > td > img").attr("src");
          const description = $(e).find("tbody > tr:nth-child(2) > td > p").text();
          return { img, description };
        } else {  // <p />
          return $(e).text();
        }
      }).get(),
    };

    // console.log("Content: ", article);
    await appInfo.db.save("articles", article);
  }

}
