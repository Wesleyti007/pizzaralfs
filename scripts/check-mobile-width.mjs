import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 })
await page.waitForTimeout(800)

const metrics = await page.evaluate(() => {
  const m = (el) =>
    el
      ? {
          offset: el.offsetWidth,
          client: el.clientWidth,
          scroll: el.scrollWidth,
        }
      : null
  const docW = document.documentElement.clientWidth
  const overflowEls = [...document.querySelectorAll('img, .card, .menu-grid, .home-page')]
    .filter((el) => el.scrollWidth > docW + 2)
    .map((el) => ({
      tag: el.tagName,
      class: el.className,
      scroll: el.scrollWidth,
      docW,
    }))
  return {
    viewport: window.innerWidth,
    doc: m(document.documentElement),
    body: m(document.body),
    app: m(document.querySelector('.app')),
    home: m(document.querySelector('.home-page')),
    overflowEls,
  }
})

console.log(JSON.stringify(metrics, null, 2))
await page.screenshot({ path: '/tmp/pizza-mobile-test.png' })
await browser.close()
