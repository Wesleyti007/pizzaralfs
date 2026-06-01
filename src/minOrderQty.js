import { cartLineKey } from './catalog.js'

export function normalizeMinOrderQty(value) {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(99, parsed)
}

export function getMinOrderQty(item) {
  return normalizeMinOrderQty(item?.minOrderQty)
}

export function formatMinOrderHint(item) {
  const min = getMinOrderQty(item)
  if (min <= 1) return null
  return `Mínimo ${min} unidades por pedido`
}

export function validateCartMinOrderQty(cart) {
  if (!Array.isArray(cart)) return { ok: true }

  for (const line of cart) {
    const min = getMinOrderQty(line)
    const qty = Math.floor(Number(line.qty) || 0)
    if (qty < min) {
      return {
        ok: false,
        message: `"${line.name}" exige no mínimo ${min} unidades (você tem ${qty}).`,
        lineKey: cartLineKey(line),
      }
    }
  }

  return { ok: true }
}
