export const config = {
    puppeteer: {
        headless: false,
        devtools: true,
        // args: [
        //     "--proxy-server=127.0.0.1:2007"
        // ]
    },
    twitter: {
        // Timeout for capturing information for a movie (in milliseconds)
        movieTaskTimeout: 1000 * 60 * 20,
        // 一个电影最多抓取多少条评论
        commentMaxNum: 50,
        // 向下滚动加载更多评论的最大尝试次数
        scrollAndCheckMaxNum: 10,
        // 每次滚动检查评论的间隔(单位：毫秒)
        scrollAndCheckInterval: 1000
    },
    logger: {
        level: "info"
    }
};
