import { normalizeCepDigits } from './deliveryKm.js'

function rowToSettings(row = {}) {
  return {
    deliveryFee: Math.max(0, Number(row.deliveryFee) || 0),
    establishmentCep: normalizeCepDigits(row.establishmentCep),
    establishmentStreet: String(row.establishmentStreet || '').trim(),
    establishmentNumber: String(row.establishmentNumber || '').trim(),
    establishmentNeighborhood: String(row.establishmentNeighborhood || '').trim(),
    establishmentCity: String(row.establishmentCity || '').trim(),
    establishmentState: String(row.establishmentState || '').trim(),
    deliveryPricePerKm: Math.max(0, Number(row.deliveryPricePerKm) || 0),
  }
}

export async function loadCatalogSettings(query) {
  try {
    const result = await query(
      `SELECT delivery_fee AS "deliveryFee",
              establishment_cep AS "establishmentCep",
              establishment_street AS "establishmentStreet",
              establishment_number AS "establishmentNumber",
              establishment_neighborhood AS "establishmentNeighborhood",
              establishment_city AS "establishmentCity",
              establishment_state AS "establishmentState",
              delivery_price_per_km AS "deliveryPricePerKm"
       FROM catalog_settings WHERE id = 1`,
    )
    return rowToSettings(result.rows[0])
  } catch {
    return rowToSettings()
  }
}

export async function saveCatalogSettings(query, raw) {
  const settings = rowToSettings({
    deliveryFee: raw?.deliveryFee,
    establishmentCep: raw?.establishmentCep,
    establishmentStreet: raw?.establishmentStreet,
    establishmentNumber: raw?.establishmentNumber,
    establishmentNeighborhood: raw?.establishmentNeighborhood,
    establishmentCity: raw?.establishmentCity,
    establishmentState: raw?.establishmentState,
    deliveryPricePerKm: raw?.deliveryPricePerKm,
  })

  await query(
    `INSERT INTO catalog_settings (
       id, categories, delivery_fee,
       establishment_cep, establishment_street, establishment_number,
       establishment_neighborhood, establishment_city, establishment_state,
       delivery_price_per_km, updated_at
     )
     VALUES (1, '[]'::jsonb, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (id)
     DO UPDATE SET
       delivery_fee = EXCLUDED.delivery_fee,
       establishment_cep = EXCLUDED.establishment_cep,
       establishment_street = EXCLUDED.establishment_street,
       establishment_number = EXCLUDED.establishment_number,
       establishment_neighborhood = EXCLUDED.establishment_neighborhood,
       establishment_city = EXCLUDED.establishment_city,
       establishment_state = EXCLUDED.establishment_state,
       delivery_price_per_km = EXCLUDED.delivery_price_per_km,
       updated_at = NOW()`,
    [
      settings.deliveryFee,
      settings.establishmentCep,
      settings.establishmentStreet,
      settings.establishmentNumber,
      settings.establishmentNeighborhood,
      settings.establishmentCity,
      settings.establishmentState,
      settings.deliveryPricePerKm,
    ],
  )

  return settings
}
