#!/usr/bin/env node
/**
 * Gera SQL que grava a foto padrão do calzone em todos os itens da categoria.
 * Uso: node scripts/update-calzone-images.mjs > /tmp/calzone-images.sql
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const imagePath = path.join(root, 'public', 'calzone-default.png')

if (!fs.existsSync(imagePath)) {
  console.error(`Imagem não encontrada: ${imagePath}`)
  process.exit(1)
}

const b64 = fs.readFileSync(imagePath).toString('base64')
const dataUrl = `data:image/png;base64,${b64}`
const escaped = dataUrl.replace(/'/g, "''")

console.log(`UPDATE menu_items SET image_base64 = '${escaped}' WHERE category = 'calzone';`)
