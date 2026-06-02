/**
 * CEP + cotação por km — reativar com ENABLE_KM_CEP_DELIVERY em deliveryCep.js
 * e restaurar exports fetchAddressByCep / fetchDeliveryQuote.
 */
import { ENABLE_KM_CEP_DELIVERY, normalizeCepDigits } from './deliveryCep.js'

import { API_BASE_URL } from './apiBaseUrl.js'

export function usesKmDeliveryPricingWhenEnabled(settings) {
  if (!ENABLE_KM_CEP_DELIVERY) return false
  const cep = normalizeCepDigits(settings?.establishmentCep)
  const pricePerKm = Number(settings?.deliveryPricePerKm)
  return cep.length === 8 && Number.isFinite(pricePerKm) && pricePerKm > 0
}

export async function fetchAddressByCep(cep) {
  const digits = normalizeCepDigits(cep)
  if (digits.length !== 8) {
    throw new Error('CEP inválido')
  }

  const response = await fetch(`${API_BASE_URL}/delivery/cep/${digits}`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.message || 'Não foi possível consultar o CEP')
  }

  return body
}

export async function fetchDeliveryQuote(deliveryInfo) {
  const params = new URLSearchParams({
    cep: normalizeCepDigits(deliveryInfo.cep),
    street: String(deliveryInfo.street || '').trim(),
    number: String(deliveryInfo.number || '').trim(),
    neighborhood: String(deliveryInfo.neighborhood || '').trim(),
    city: String(deliveryInfo.city || '').trim(),
    state: String(deliveryInfo.state || '').trim(),
  })

  const response = await fetch(`${API_BASE_URL}/delivery/quote?${params}`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.message || 'Não foi possível calcular a entrega')
  }

  return body
}
