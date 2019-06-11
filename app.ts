import {Launcher, logger, PuppeteerWorkerFactory} from "ppspider";
import {TwitterTask} from "./tasks/twitter.task";
import {config} from "./config";

@Launcher({
    workplace: __dirname + "/workplace",
    tasks: [
        TwitterTask
    ],
    workerFactorys: [
        new PuppeteerWorkerFactory(config.puppeteer)
    ],
    logger: config.logger
})
class App {

}
