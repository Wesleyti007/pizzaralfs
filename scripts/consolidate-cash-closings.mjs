#!/usr/bin/env node
/** Atalho: use backend/scripts/consolidate-cash-closings.mjs */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const target = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../backend/scripts/consolidate-cash-closings.mjs',
)
const child = spawn(process.execPath, [target, ...process.argv.slice(2)], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 1))
