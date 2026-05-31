const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const VIACEP_URL = 'https://viacep.com.br/ws'
const ROAD_DISTANCE_FACTOR = 1.3

export function normalizeCepDigits(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 8)
}

function buildAddressLine(parts) {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ')
}

export async function fetchViaCep(cep) {
  const digits = normalizeCepDigits(cep)
  if (digits.length !== 8) {
    throw new Error('CEP invalido')
  }

  const response = await fetch(`${VIACEP_URL}/${digits}/json/`)
  if (!response.ok) {
    throw new Error('Falha ao consultar CEP')
  }

  const data = await response.json()
  if (data.erro) {
    throw new Error('CEP nao encontrado')
  }

  return {
    cep: digits,
    street: String(data.logradouro || '').trim(),
    neighborhood: String(data.bairro || '').trim(),
    city: String(data.localidade || '').trim(),
    state: String(data.uf || '').trim(),
  }
}

async function geocodeAddress(parts) {
  const query = `${buildAddressLine(parts)}, Brasil`
  if (!query.replace(/[, Brasil]/g, '').trim()) {
    throw new Error('Endereco incompleto para calcular distancia')
  }

  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'br')

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PizzaRalfs/1.0 (delivery-fee)',
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Falha ao localizar endereco no mapa')
  }

  const rows = await response.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Nao foi possivel localizar o endereco')
  }

  return {
    lat: Number(rows[0].lat),
    lon: Number(rows[0].lon),
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return 6371 * c
}

/** Reativar CEP/km: true + rotas /delivery/* em server.js */
export const ENABLE_KM_CEP_DELIVERY = false

export function usesKmDeliveryPricing(settings) {
  if (!ENABLE_KM_CEP_DELIVERY) return false
  const cep = normalizeCepDigits(settings?.establishmentCep)
  const pricePerKm = Number(settings?.deliveryPricePerKm)
  return cep.length === 8 && Number.isFinite(pricePerKm) && pricePerKm > 0
}

export function composeDeliveryAddress(info) {
  const streetLine = [info.street, info.number].filter(Boolean).join(', ')
  const cityLine = [info.neighborhood, info.city, info.state].filter(Boolean).join(' - ')
  const cep = normalizeCepDigits(info.cep)
  const chunks = [streetLine, cityLine].filter(Boolean)
  if (cep.length === 8) {
    chunks.push(`CEP ${cep.slice(0, 5)}-${cep.slice(5)}`)
  }
  return chunks.join(' — ')
}

export async function quoteDeliveryFee(settings, customer) {
  const minFee = Math.max(0, Number(settings?.deliveryFee) || 0)

  if (!usesKmDeliveryPricing(settings)) {
    return {
      fee: minFee,
      distanceKm: null,
      pricingMode: 'fixed',
    }
  }

  const establishment = {
    cep: settings.establishmentCep,
    street: settings.establishmentStreet,
    number: settings.establishmentNumber,
    neighborhood: settings.establishmentNeighborhood,
    city: settings.establishmentCity,
    state: settings.establishmentState,
  }

  const customerCep = normalizeCepDigits(customer.cep)
  if (customerCep.length !== 8) {
    throw new Error('Informe o CEP do cliente')
  }

  let street = String(customer.street || '').trim()
  let neighborhood = String(customer.neighborhood || '').trim()
  let city = String(customer.city || '').trim()
  let state = String(customer.state || '').trim()

  if (!street || !city || !state) {
    const via = await fetchViaCep(customerCep)
    street = street || via.street
    neighborhood = neighborhood || via.neighborhood
    city = city || via.city
    state = state || via.state
  }

  const number = String(customer.number || '').trim()
  if (!number) {
    throw new Error('Informe o numero do endereco')
  }

  const [fromCoords, toCoords] = await Promise.all([
    geocodeAddress([
      establishment.street,
      establishment.number,
      establishment.neighborhood,
      establishment.city,
      establishment.state,
      establishment.cep,
    ]),
    geocodeAddress([street, number, neighborhood, city, state, customerCep]),
  ])

  const straightKm = haversineKm(fromCoords.lat, fromCoords.lon, toCoords.lat, toCoords.lon)
  const distanceKm = Math.round(straightKm * ROAD_DISTANCE_FACTOR * 100) / 100
  const pricePerKm = Number(settings.deliveryPricePerKm)
  const rawFee = distanceKm * pricePerKm
  const fee = Math.max(minFee, Math.round(rawFee * 100) / 100)

  return {
    fee,
    distanceKm,
    pricePerKm,
    minFee,
    pricingMode: 'km',
  }
}
