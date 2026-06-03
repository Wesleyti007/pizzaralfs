#!/usr/bin/env node
import { execSync } from 'node:child_process'

const base = process.argv[2] || 'https://pizzaralfs.com.br'
const items = JSON.parse(
  execSync(`curl -s -A "Mozilla/5.0" "${base}/menu-items"`, { encoding: 'utf8' }),
)
const withImg = items.filter((i) => i.hasImage)
let ok = 0
const fail = []
for (const item of withImg) {
  const url = `${base}/menu-items/${item.id}/image?v=card`
  const code = execSync(`curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0" "${url}"`, {
    encoding: 'utf8',
  }).trim()
  if (code === '200' || code === '304') ok++
  else fail.push({ id: item.id, name: item.name, category: item.category, code })
}
console.log(JSON.stringify({ base, total: items.length, withImage: withImg.length, ok, failCount: fail.length, fail: fail.slice(0, 30) }, null, 2))
