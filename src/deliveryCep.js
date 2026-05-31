/**
 * CEP + taxa por km — desativado por enquanto (taxa fixa no admin).
 * Implementação completa preservada em deliveryCep.future.js
 */
export const ENABLE_KM_CEP_DELIVERY = false

export function normalizeCepDigits(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 8)
}

export function formatCepDisplay(value) {
  const digits = normalizeCepDigits(value)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function usesKmDeliveryPricing(_settings) {
  return false
}

export function composeDeliveryAddress(info) {
  const streetLine = [info.street, info.number].filter(Boolean).join(', ')
  const cityLine = [info.neighborhood, info.city, info.state].filter(Boolean).join(' - ')
  const cep = formatCepDisplay(info.cep)
  const chunks = [streetLine, cityLine].filter(Boolean)
  if (cep.length >= 9) chunks.push(`CEP ${cep}`)
  return chunks.join(' — ')
}

/* Ativo quando ENABLE_KM_CEP_DELIVERY — ver deliveryCep.future.js
export async function fetchAddressByCep(cep) { ... }
export async function fetchDeliveryQuote(deliveryInfo) { ... }
*/
