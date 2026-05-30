export async function loadCatalogSettings(query) {
  try {
    const result = await query(
      'SELECT delivery_fee AS "deliveryFee" FROM catalog_settings WHERE id = 1',
    )
    const fee = Number(result.rows[0]?.deliveryFee)
    return { deliveryFee: Number.isFinite(fee) && fee >= 0 ? fee : 0 }
  } catch {
    return { deliveryFee: 0 }
  }
}

export async function saveCatalogSettings(query, raw) {
  const fee = Math.max(0, Number(raw?.deliveryFee) || 0)
  await query(
    `INSERT INTO catalog_settings (id, categories, delivery_fee, updated_at)
     VALUES (1, '[]'::jsonb, $1, NOW())
     ON CONFLICT (id)
     DO UPDATE SET delivery_fee = EXCLUDED.delivery_fee, updated_at = NOW()`,
    [fee],
  )
  return { deliveryFee: fee }
}
