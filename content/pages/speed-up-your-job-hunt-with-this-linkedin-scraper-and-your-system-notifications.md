---
title: "Speed Up Your Job Hunt With This LinkedIn Scraper and Your System Notifications"
id: "cb38d3b3b1a34e4693deefb06f0b78f5"
slug: "speed-up-your-job-hunt-with-this-linkedin-scraper-and-your-system-notifications"
source_url: "https://adams-blog.notion.site/Speed-Up-Your-Job-Hunt-With-This-LinkedIn-Scraper-and-Your-System-Notifications-cb38d3b3b1a34e4693deefb06f0b78f5"
extracted_at: "2026-10-30T19:38:23.388Z"
cover: null
---

# Speed Up Your Job Hunt With This LinkedIn Scraper and Your System Notifications

<a id="38d2d0fa34c64e5dbdedfe835e43e81d"></a>

> [https://github.com/AdamManuel-dev/LinkedInNotifications](https://github.com/AdamManuel-dev/LinkedInNotifications)

<a id="253d45a193bb49519417429e292f59fe"></a>

In the fast-paced world of job hunting, staying ahead of the competition means being the first to know about new opportunities. With the power of automation, you can have a system that scrapes LinkedIn for job postings and notifies you in real-time. This blog post dives into a JavaScript script using Puppeteer, Node-Notifier, and Node-Cron to make your job search more efficient.

<a id="edc0ffc0b0264d9c8677b05e0c7b1052"></a>

#### Setting the Stage: The Components

<a id="d60e338b54174b658217adba012dfa4f"></a>

The script integrates several key components:

<a id="dc6d092b90534c4d88adfcf0538491d6"></a>

1. **Puppeteer**: A Node library that provides a high-level API to control Chrome or Chromium over the DevTools Protocol. It allows us to navigate the web programmatically.

<a id="9c9c403592b0493fa129eedc84978fad"></a>

1. **Node-Notifier**: A Node.js module for sending notifications on native systems (Windows, Mac, Linux).

<a id="c19db69acd4b4cacbd13fce22de93075"></a>

1. **Node-Cron**: A task scheduler in pure JavaScript for running scheduled jobs.

<a id="d4fa8da9cc854c74a4df8872e850f5f0"></a>

1. **CSV File**: Stores the job search configurations.

<a id="fbc382fa493a46caa58f481c07b5427f"></a>

1. **Cache File**: Maintains a log of previously seen job postings to avoid duplicate notifications.

<a id="2dcce5c934b142d68c2c15900e472206"></a>

#### Step-by-Step Breakdown

<a id="1b5ee83dd1204cf687266838c7ba59bc"></a>

#### 1\. Reading Configurations

<a id="0877202398024383b3124fdf2c1dd114"></a>

The script begins by reading configurations from a CSV file, `searches.csv`, which contains search terms, intervals, and LinkedIn URLs:

<a id="c3709b8d498d4171950a3b42124266f1"></a>

```
javascriptCopy code
const configCSV = fs.readFileSync('./searches.csv', {
  encoding: 'utf-8',
})

const configArr = configCSV.split('\n').map((line) => line.split(','));

configArr.shift()

const input = configArr.filter((x) => x.length === 3).map(([title, minuteLapse, url]) => ({
  url,
  title,
  minuteLapse: Number.parseInt(minuteLapse)
}))
```

<a id="84a57fe20f2649ce875546058b6992c7"></a>

This code reads the CSV file, splits it into lines, and maps each line to an object containing the job title, time interval, and LinkedIn search URL.

<a id="5b51f72675284184800dc67a7847dd49"></a>

#### 2\. Caching Previous Job Postings

<a id="c4f2294d04b341e4a790a36726024477"></a>

To avoid notifying about the same job postings multiple times, the script reads a cache file that stores previously seen URLs:

<a id="486e6cc51ec649e6970a99dec370a678"></a>

```
javascriptCopy code
const _cachedUrls = fs.readFileSync('./cache', {
  encoding: 'utf-8',
})

const cachedUrls = ((_cachedUrls.includes('\n')) ? _cachedUrls.split('\n') : []).filter((x) => x.length !== 0)
```

<a id="409600a7a1684ab0bcfd0cca861abdde"></a>

#### 3\. Scraping LinkedIn

<a id="c1d119a1932143689e362cade5e8f67f"></a>

The main function `grabLinks` uses Puppeteer to navigate to LinkedIn search pages, scrape job posting links, and filter out those already seen:

<a id="a0034ac47be34cb4aa91b3990d7ac79f"></a>

```
javascriptCopy code
const grabLinks = async ({title, url, minuteLapse}) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const properUrl = url.replace(/f_TPR\=r\d+/, minuteLapse <= 60 ? `f_TPR=r3600` : `f_TPR=r3600`).replace(/\n/g, '').trim()

    await page.goto(properUrl);

    const topLinks = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('#main-content > section.two-pane-serp-page__results-list > ul > li > div > a').forEach((node) => {
        results.push([node.innerText, node.getAttribute('href')]);
      })
      return results;
    });
    const links = topLinks.filter(([_title, link]) => {
      if(cachedUrls.length === 0) return true;
      return !cachedUrls.find((x) => encodeURI(link.split('?')[0]).includes(encodeURI(x)))
    })
    if(links.length > 0) {
      notifier.notify({
        title,
        message: `Found ${links.length} Job Postings`,
        sound: 'Basso',
        actions: 'Open in Chrome',
        timeout: 120,
        contentImage: `${process.cwd()}/LinkedIn.svg`,
      }, async function (_error, response) {
        if(response === 'activate') {
          const command = links.slice(0, limit).map(([_, _url]) => `open -a "Google Chrome" "${_url}"`).join(' && sleep 0.1 && ')
          await exec(command)
          fs.writeFileSync('./cache', _cachedUrls + links.map(([_, _url]) => `${_url.split('?')[0]}\n`).join(''), {
            encoding: 'utf-8'
          });
          if(links.length >= 10)
            grabLinks({title, url, minuteLapse})
        }
      });
    }
}
```

<a id="5b4e62a0b1834f71b78244a09d52c33b"></a>

This function:

<a id="8f38cb38f0374ae095ddeb9a9520538c"></a>

1. Launches a headless browser and navigates to the LinkedIn search URL.

<a id="f32c89dd8a9f45aa95a4b4dbbb97a2c0"></a>

1. Scrapes job links from the page.

<a id="e693748d331747dab58c0429815f31cb"></a>

1. Filters out links already seen and stored in the cache.

<a id="02466be78d7e450dae8fe5c89fc5399b"></a>

1. Sends a system notification if new job postings are found.

<a id="35c63496fc4f43c990cd6c162fabd1f9"></a>

1. Opens the links in Chrome if the user interacts with the notification.

<a id="4acd73b0293a41a09c676cbed438907c"></a>

1. Updates the cache with new job links.

<a id="a89ebd001cbd43659681827910da3fec"></a>

#### 4\. Scheduling the Job Scraper

<a id="173c3695d7c0457faf83a7a0c7ad8751"></a>

To continuously check for new job postings, the script uses Node-Cron to schedule the `grabLinks` function at specified intervals:

<a id="8a5e82070e584f358d6b8861332bd05f"></a>

```
javascriptCopy code
(function run() {
  input.forEach(({minuteLapse, title, url}, i) => {
    grabLinks({title, url, minuteLapse})
    cron.schedule(`*/${minuteLapse} * * * *`, () => {
      grabLinks({title, url, minuteLapse})
    });
  })
})()
```

<a id="f6b1641d607f44bdaad6c84ecfb68d62"></a>

This self-executing function loops through each job search configuration and sets up the scraper to run at the defined intervals.

<a id="229d022fc67c425490f39b83575d4499"></a>

#### Conclusion

<a id="b40eb987ea2b469ea2179933031ed322"></a>

This script automates the process of finding and notifying about new job opportunities on LinkedIn. By leveraging Puppeteer for web scraping, Node-Notifier for system notifications, and Node-Cron for scheduling tasks, it ensures you stay on top of new job postings with minimal effort. Whether you're an active job seeker or just keeping an eye out for the next big opportunity, this automated solution can give you the edge in your job search.
