/**
 * Integração futura: taxa de entrega por CEP / região.
 *
 * Hoje o cardápio usa só a taxa fixa do admin (aba Delivery).
 * Ative esta feature quando fizer sentido cobrar valores diferentes por bairro,
 * distância ou faixa de CEP.
 *
 * Passos para ligar (resumo):
 * 1. Mudar DELIVERY_CEP_FEATURE_ENABLED para true
 * 2. Descomentar o corpo de resolveDeliveryFee e as funções abaixo
 * 3. Em delivery.js: campo cep no formulário + validação
 * 4. Em pricing.js calcCartTotals: passar deliveryCep e usar resolveDeliveryFee
 * 5. (Opcional) Persistir faixas de CEP no admin / API em vez de DELIVERY_FEE_BY_ZONE
 */

/** Troque para true quando for usar CEP na taxa de entrega. */
export const DELIVERY_CEP_FEATURE_ENABLED = false

/**
 * Taxa efetiva no carrinho. Por enquanto devolve só a taxa fixa do admin.
 */
export function resolveDeliveryFee({ baseFee = 0, cep = '', address = '' } = {}) {
  const fixed = Math.max(0, Number(baseFee) || 0)

  if (!DELIVERY_CEP_FEATURE_ENABLED) {
    return fixed
  }

  // --- Descomente o bloco abaixo junto com as funções no final do arquivo ---
  // const normalizedCep = normalizeCepDigits(cep)
  // if (normalizedCep.length !== 8) {
  //   return fixed
  // }
  // return calculateDeliveryFeeByCep(normalizedCep, { baseFee: fixed, address })

  return fixed
}

// =============================================================================
// Implementação comentada (ViaCEP + faixas locais)
// =============================================================================

// export function normalizeCepDigits(value) {
//   return String(value ?? '').replace(/\D/g, '').slice(0, 8)
// }
//
// export function formatCepDisplay(value) {
//   const digits = normalizeCepDigits(value)
//   if (digits.length <= 5) return digits
//   return `${digits.slice(0, 5)}-${digits.slice(5)}`
// }
//
// /** Consulta endereço pelo CEP (API pública, sem chave). */
// export async function fetchAddressByCep(cep) {
//   const digits = normalizeCepDigits(cep)
//   if (digits.length !== 8) {
//     throw new Error('CEP inválido')
//   }
//   const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
//   if (!response.ok) {
//     throw new Error('Não foi possível consultar o CEP')
//   }
//   const data = await response.json()
//   if (data.erro) {
//     throw new Error('CEP não encontrado')
//   }
//   return {
//     cep: digits,
//     street: data.logradouro || '',
//     neighborhood: data.bairro || '',
//     city: data.localidade || '',
//     state: data.uf || '',
//   }
// }
//
// /**
//  * Exemplo de faixas — ajuste para sua cidade / bairros atendidos.
//  * prefix: primeiros dígitos do CEP (sem hífen)
//  * fee: taxa somada (ou substitui baseFee se usar mode: 'replace')
//  */
// export const DELIVERY_FEE_BY_ZONE = [
//   { label: 'Região central', prefixes: ['01310', '01311'], fee: 6 },
//   { label: 'Proximidades', prefixes: ['01312', '01313'], fee: 10 },
//   { label: 'Demais áreas', prefixes: ['*'], fee: 15 },
// ]
//
// export function calculateDeliveryFeeByCep(cepDigits, { baseFee = 0, address = '' } = {}) {
//   const zone = DELIVERY_FEE_BY_ZONE.find((entry) =>
//     entry.prefixes.some((prefix) => prefix === '*' || cepDigits.startsWith(prefix)),
//   )
//   const zoneFee = zone ? Math.max(0, Number(zone.fee) || 0) : Math.max(0, Number(baseFee) || 0)
//   // Pode somar taxa fixa + zona: return Math.max(baseFee, zoneFee)
//   // Ou só zona: return zoneFee
//   void address
//   return zoneFee
// }
//
// /** Valida CEP no formulário quando a feature estiver ativa. */
// export function getCepFieldError(cep) {
//   if (!DELIVERY_CEP_FEATURE_ENABLED) return ''
//   const digits = normalizeCepDigits(cep)
//   if (digits.length !== 8) return 'CEP obrigatório (8 dígitos)'
//   return ''
// }
