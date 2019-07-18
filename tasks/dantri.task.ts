import * as Cheerio from "cheerio";
import * as crypto from "crypto";
import {
  AddToQueue,
  appInfo,
  DbHelperUi,
  FromQueue,
  Job,
  Launcher, logger,
  OnStart,
  RequestUtil,
} from "ppspider";
import * as url from "url";

function md5(text: string) {
  return crypto.createHash("md5").update(Buffer.from(text)).digest("hex");
}

export class QuotesTask {

  @OnStart({
    urls: "https://vnexpress.net/tin-tuc/phap-luat",
  })
  @FromQueue({
    name: "dantri_list_news",
    exeInterval: 0,
  })
  @AddToQueue({ name: "dantri_list_news" })
  public async getQuotes(job: Job) {
    job.depth === 0 && logger.info("open http://localhost:9000/#/dataUi/DbHelperUi, choose quotes collection and submit, you will say the quotes.");

    const htmlRes = await RequestUtil.simple({ url: job.url });
    const $ = Cheerio.load(htmlRes.body);

    const quotes = $(".list_news").map((index, element) => {
      const $quoteEle = $(element);
      return {
        text: $quoteEle.find(".text").text().replace(/^[“"]|[”"]$/g, ""),
        author: $quoteEle.find(".author").text(),
        tags: $quoteEle.find(".tags .tag").map((tagI, tagEle) => $(tagEle).text()).get(),
      };
    }).get();

    for (const item of quotes) {
      item._id = md5(item.text);
      await appInfo.db.save("quotes", item);
    }

    // only added to a queue, so there is no need to specify which queue to add to via {quote_pages: urls}
    // Since the href attribute is /page/2/, an incomplete format, the full path needs to be calculated via url.resolve
    return $("nav > ul.pager > li.next > a")
      .map((index, element) => url.resolve(job.url, element.attribs.href)).get();
  }

}
