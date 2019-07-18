import { get as getConfig } from "config";
import { DbHelperUi, Launcher, PuppeteerWorkerFactory } from "ppspider";
import { QuotesTask } from "./tasks/quotes.task";
import { TwitterTask } from "./tasks/twitter.task";

@Launcher({
  workplace: __dirname + "/workplace",
  // dbUrl: "nedb://workplace_nedb/nedb", // (default)
  dbUrl: getConfig("DB_URL"),
  tasks: [
    // TwitterTask,
    QuotesTask,
  ],
  workerFactorys: [
    new PuppeteerWorkerFactory(getConfig("puppeteer")),
  ],
  dataUis: [
    DbHelperUi,
  ],
  logger: getConfig("logger"),
  webUiPort: 8080,
})
class App {}
