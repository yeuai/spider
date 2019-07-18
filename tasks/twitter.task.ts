import {
  AddToQueue,
  AddToQueueData,
  appInfo,
  FileUtil,
  FromQueue,
  Job,
  logger,
  OnStart,
  Page,
  PuppeteerUtil,
  // PuppeteerWorkerFactory,
} from "ppspider";
// import { Page } from "puppeteer";
import { config } from "../config";
import { topics } from "../topics";

declare var jQuery: any;

export class TwitterTask {

  @OnStart({
    description: "Load all tasks from topics into the topics queue",
    urls: "",
    parallel: 1,
  })
  @AddToQueue({
    name: "topics",
  })
  public async addTopicsToQueue(worker: any, job: Job): AddToQueueData {
    return topics.map((item) => {
      const tempJob = new Job(`https://mobile.twitter.com/search?q=${encodeURI(item)}&src=typed_query`);
      tempJob.datas.topic = item;
      return tempJob;
    });
  }

  @FromQueue({
    description: "Crawl a topic's comment list",
    name: "topics",
    parallel: 1,
    exeInterval: 5000,
  })
  @AddToQueue({
    name: "users",
  })
  public async topic(page: Page, job: Job) {
    await Promise.all([
      PuppeteerUtil.defaultViewPort(page),
      PuppeteerUtil.setImgLoad(page, false),
    ]);

    await page.goto(job.url);
    await PuppeteerUtil.addJquery(page);

    console.log("CONFig: ", config);
    const comments = await page.evaluate((pageConfig: any) => new Promise((resolve) => {
      const $ = jQuery;
      const vComments: any[] = [];

      // timeout returns results directly
      setTimeout(() => resolve(vComments), 1000 * 60 * 1); // chạy 1 phút

      // parse a comment from a div
      const parseComment = ($comment: any) => {
        try {
          const comment: any = {
            count: {},
          };
          const $infoDivs = $comment.find("> div:eq(1) > div:eq(0) > div");

          // user Info
          const $userA = $($infoDivs[0]).find("a:eq(0)");
          comment.user = $userA.attr("href").substring(1).split("/")[0];

          // comment.user.name = $userA.find("span[dir='auto']:eq(0)").text().trim();

          // issuing time
          comment.time = $($infoDivs[0]).find("time:eq(0)").attr("datetime");

          let isReplyToOthers = false;
          if ($infoDivs.length >= 2) {
            // reply to others
            const replyTos = $($infoDivs[1]).find("a span[dir='auto']").text().trim().split("@").filter((item: any) => item);
            if (replyTos.length > 0) {
              if (!comment.replyTos) { comment.replyTos = []; }
              for (const replyTo of replyTos) {
                comment.replyTos.push(replyTo);
              }
              isReplyToOthers = true;
            }
          }

          // content
          comment.content = $($infoDivs[isReplyToOthers ? 2 : 1]).text();

          // tweet related statistics
          const $countDivs = $comment.find("> div:eq(1) > div:eq(1) > div");
          const countKey = ["reply", "forward", "like"];
          for (let i = 0, len = $countDivs.length; i < 3 && i < len; i++) {
            const $countDiv = $($countDivs[i]).find("svg:eq(0)").parent().next();
            if ($countDiv.length) {
              comment.count[countKey[i]] = parseInt($countDiv.text());
            } else { comment.count[countKey[i]] = 0; }
          }

          return comment;
        } catch (e) {
          console.log(e);
        }
      };

      const commentMaxNum = pageConfig.commentMaxNum;
      const scrollAndCheckMaxNum = pageConfig.scrollAndCheckMaxNum;
      const scrollAndCheckInterval = pageConfig.scrollAndCheckInterval;

      let curComment: any = null;
      let curCommentNum = 0;
      let scrollAndCheckNum = 0;

      // grab a comment and scroll down the height of a comment.
      // if there are no more comments below, try scrolling down to load more and then check for new comments.
      const scrollAndCheck = () => {
        let waitMore = false;
        const $comments = $("article > div[data-testid='tweet']");
        if ($comments.length) {
          if (curComment == null) {
            curComment = $comments[0];
          } else {
            for (let j = 0, len = $comments.length; j < len; j++) {
              if ($comments[j] === curComment) {
                if (j + 1 < len) {
                  curComment = $comments[j + 1];
                  break;
                } else {
                  waitMore = true;
                }
              }
            }
          }
        } else {
          waitMore = true;
        }

        if (waitMore) {
          scrollAndCheckNum++;
          if (scrollAndCheckNum < scrollAndCheckMaxNum) {
            window.scrollBy(0, 1000);
            setTimeout(scrollAndCheck, scrollAndCheckInterval);
          } else {
            resolve(vComments);
          }
        } else {
          curCommentNum++;
          scrollAndCheckNum = 0;

          const comment = parseComment($(curComment));
          if (comment) {
            vComments.push(comment);
          }

          if (curCommentNum < commentMaxNum) {
            window.scrollBy(0, $(curComment).height());
            setTimeout(scrollAndCheck, 50);
          } else {
            resolve(vComments);
          }
        }
      };
      scrollAndCheck();
    }), config.twitter);

    if (logger.debugValid) {
      logger.debug(JSON.stringify(comments, null, 4));
    }

    // save comment
    const name = job.datas.name;
    const prettyName = name.replace(new RegExp("[\/. ]", "g"), "_");
    FileUtil.write(appInfo.workplace + "/data/topics/" + prettyName + ".json", JSON.stringify({
      url: job.url,
      name,
      comments,
    }));

    // add users to the queue to crawl user information
    const userIds: any[] = [];
    (comments as any[]).forEach((comment) => {
      if (comment.user) { userIds.push(comment.user); }
      if (comment.replyTos) { comment.replyTos.forEach((id: any) => userIds.push(id)); }
    });
    return userIds.map((userId) => {
      const tempJob = new Job(`https://mobile.twitter.com/${userId}`);
      tempJob.datas = {
        id: userId,
      };
      tempJob.key = userId;
      return tempJob;
    });
  }

  @FromQueue({
    description: "Crawl a user's information",
    name: "users",
    parallel: 1,
    exeInterval: 5000,
  })
  public async user(page: Page, job: Job) {
    await Promise.all([
      PuppeteerUtil.defaultViewPort(page),
      PuppeteerUtil.setImgLoad(page, false),
    ]);

    let userInfoResolve: any;
    const waitUserInfo = new Promise((resolve) => {
      setTimeout(() => resolve(null), 30000);
      userInfoResolve = resolve;
    });
    PuppeteerUtil.onResponse(page, ".*/graphql/.*", async (response) => {
      try {
        const json = await response.json();
        if (json.data && json.data.user && json.data.user.legacy) {
          userInfoResolve(json.data.user.legacy);
        } else if (json.errors) {
          // known error: User has been frozen
          userInfoResolve({
            errors: json.errors,
          });
        }
      } catch (e) {
        console.error("Error:", e);
      }
    });
    await page.goto(job.url);

    const userInfo: any = await waitUserInfo;
    const userId = job.datas.id;
    if (userInfo == null) {
      // listen to the corresponding timeout of the user information,
      // throw an exception, the task fails, the task will retry twice
      throw new Error(`fail to get userInfo, id: ${userId}`);
    }

    if (logger.debugValid) {
      logger.debug(JSON.stringify(userInfo, null, 4));
    }
    if (!userInfo.errors) {
      FileUtil.write(appInfo.workplace + "/data/users/" + userId + ".json", JSON.stringify(userInfo));
    } else {
      logger.warnValid && logger.warn(`fail to get userInfo, id: ${userId}\n${JSON.stringify(userInfo, null, 4)}`);
    }
  }

}
