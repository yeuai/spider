import { DbHelperUi, Launcher, PuppeteerWorkerFactory } from "ppspider";
import { config } from "./config";
import { QuotesTask } from "./tasks/quotes.task";
import { TwitterTask } from "./tasks/twitter.task";
import { VNExpressTask } from "./tasks/vnexpress.task";

@Launcher({
  workplace: __dirname + "/workplace",
  tasks: [
    // TwitterTask,
    // QuotesTask,
    VNExpressTask,
  ],
  workerFactorys: [
    new PuppeteerWorkerFactory(config.puppeteer),
  ],
  dataUis: [
    DbHelperUi,
  ],
  logger: config.logger,
  webUiPort: 9001,
})
class App { }
