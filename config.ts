export const config = {
  puppeteer: {
    headless: true,
    devtools: false,
    // args: [
    //     "--proxy-server=127.0.0.1:2007"
    // ]
  },
  twitter: {
    // Timeout for capturing information for a movie (in milliseconds)
    movieTaskTimeout: 1000 * 60 * 20,
    // How many comments a movie grabs
    commentMaxNum: 50,
    // Scroll down to the maximum number of attempts to load more comments
    scrollAndCheckMaxNum: 10,
    // Interval for checking comments each time (in milliseconds)
    scrollAndCheckInterval: 1000,
  },
  logger: {
    level: "info",
  },
};
