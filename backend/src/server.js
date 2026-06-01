import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCategoriesFromDb, saveCategoriesToDb } from './categories.js'
import { loadCatalogSettings, saveCatalogSettings } from './catalogSettings.js'
import { composeDeliveryAddress, normalizeCepDigits, quoteDeliveryFee, usesKmDeliveryPricing } from './deliveryKm.js'
import { query } from './db.js'
import multer from 'multer'
import { normalizeMenuImageBuffer, normalizeMenuImageString } from './menuImage.js'
import {
  prefersWebp,
  resolveImageVariant,
  serveMenuItemImageFromStored,
} from './serveMenuImage.js'
import { buildMenuItemPayload, normalizeMenuItemRow } from './menuSizes.js'
import { validateOrderItemsMinQty } from './minOrderQty.js'

const MENU_ITEM_COLUMNS = `id, category, subcategory, name, description, price, delivery_price, sizes,
  min_order_qty, image_base64 AS image, is_active`

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true)
      return
    }
    cb(new Error('Envie um arquivo de imagem (JPG, PNG ou WebP).'))
  },
})

async function buildMenuItemPayloadWithImage(body, { forUpdate = false } = {}) {
  const built = buildMenuItemPayload(body)
  if (built.error) {
    return built
  }

  const imageRaw = String(built.payload.image || '').trim()
  if (!imageRaw) {
    if (forUpdate) {
      built.keepExistingImage = true
      built.payload.image = null
    } else {
      built.payload.image = ''
    }
    return built
  }

  try {
    built.payload.image = await normalizeMenuImageString(imageRaw)
  } catch (error) {
    return {
      error: error.message || 'Nao foi possivel processar a imagem.',
    }
  }

  return built
}

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/categories', async (_req, res) => {
  try {
    const categories = await loadCategoriesFromDb(query)
    return res.json(categories)
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar categorias', detail: error.message })
  }
})

app.get('/settings', async (_req, res) => {
  try {
    const settings = await loadCatalogSettings(query)
    return res.json(settings)
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao carregar configuracoes', detail: error.message })
  }
})

app.put('/settings', async (req, res) => {
  try {
    const saved = await saveCatalogSettings(query, req.body)
    return res.json(saved)
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao salvar configuracoes', detail: error.message })
  }
})

/* CEP + taxa por km — reativar com ENABLE_KM_CEP_DELIVERY em deliveryKm.js
app.get('/delivery/cep/:cep', async (req, res) => { ... })
app.get('/delivery/quote', async (req, res) => { ... })
*/

app.put('/categories', async (req, res) => {
  const { categories } = req.body
  if (!Array.isArray(categories)) {
    return res.status(400).json({ message: 'Lista de categorias invalida' })
  }

  try {
    const saved = await saveCategoriesToDb(query, categories)
    return res.json(saved)
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao salvar categorias', detail: error.message })
  }
})

app.post('/menu-items/process-image', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: 'Selecione um arquivo de imagem.' })
    }
    const image = await normalizeMenuImageBuffer(req.file.buffer)
    return res.json({ image })
  } catch (error) {
    return res.status(400).json({
      message: error.message || 'Nao foi possivel processar a imagem.',
    })
  }
})

function rowHasStoredImage(raw) {
  const value = String(raw || '').trim()
  return value.length > 32
}

function formatMenuItemForList(row, { includeImages = false } = {}) {
  const item = normalizeMenuItemRow(row)
  const hasImage = rowHasStoredImage(item.image)
  if (includeImages) {
    return { ...item, hasImage }
  }
  const { image: _image, ...rest } = item
  return { ...rest, hasImage }
}

app.get('/menu-items', async (req, res) => {
  try {
    const includeInactive = req.query.all === '1'
    const includeImages = req.query.includeImages === '1'
    const result = await query(
      `SELECT ${MENU_ITEM_COLUMNS}
       FROM menu_items
       ${includeInactive ? '' : 'WHERE is_active = TRUE'}
       ORDER BY id DESC`,
    )
    return res.json(
      result.rows.map((row) => formatMenuItemForList(row, { includeImages })),
    )
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar produtos', detail: error.message })
  }
})

app.get('/menu-items/:id/image', async (req, res) => {
  const itemId = Number(req.params.id)
  if (!Number.isInteger(itemId)) {
    return res.status(400).end()
  }

  const variant = resolveImageVariant(req.query.v ?? req.query.size)
  const wantWebp = prefersWebp(req.headers.accept)

  try {
    const result = await query(
      `SELECT image_base64 AS image FROM menu_items WHERE id = $1`,
      [itemId],
    )
    if (!result.rows.length) {
      return res.status(404).end()
    }

    const served = await serveMenuItemImageFromStored(result.rows[0].image, {
      itemId,
      variant,
      preferWebp: wantWebp,
    })
    if (!served) {
      return res.status(404).end()
    }

    if (req.headers['if-none-match'] === served.etag) {
      return res.status(304).end()
    }

    res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    res.setHeader('ETag', served.etag)
    res.setHeader('Vary', 'Accept')
    res.type(served.mime)
    return res.send(served.buffer)
  } catch {
    return res.status(500).end()
  }
})

app.post('/menu-items', async (req, res) => {
  const built = await buildMenuItemPayloadWithImage(req.body, { forUpdate: false })
  if (built.error) {
    return res.status(400).json({ message: built.error })
  }

  const { payload } = built

  try {
    const result = await query(
      `INSERT INTO menu_items (category, subcategory, name, description, price, delivery_price, sizes, min_order_qty, image_base64, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${MENU_ITEM_COLUMNS}`,
      [
        payload.category,
        payload.subcategory,
        payload.name,
        payload.description,
        payload.price,
        payload.deliveryPrice,
        JSON.stringify(payload.sizes),
        payload.minOrderQty,
        payload.image,
        payload.isActive !== false,
      ],
    )
    return res
      .status(201)
      .json(formatMenuItemForList(result.rows[0], { includeImages: true }))
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao criar produto', detail: error.message })
  }
})

app.put('/menu-items/:id', async (req, res) => {
  const itemId = Number(req.params.id)

  if (!Number.isInteger(itemId)) {
    return res.status(400).json({ message: 'ID invalido' })
  }

  const built = await buildMenuItemPayloadWithImage(req.body, { forUpdate: true })
  if (built.error) {
    return res.status(400).json({ message: built.error })
  }

  const { payload } = built

  try {
    const baseParams = [
      itemId,
      payload.category,
      payload.subcategory,
      payload.name,
      payload.description,
      payload.price,
      payload.deliveryPrice,
      JSON.stringify(payload.sizes),
      payload.minOrderQty,
    ]

    const result = built.keepExistingImage
      ? await query(
          `UPDATE menu_items
           SET category = $2,
               subcategory = $3,
               name = $4,
               description = $5,
               price = $6,
               delivery_price = $7,
               sizes = $8,
               min_order_qty = $9,
               is_active = $10
           WHERE id = $1
           RETURNING ${MENU_ITEM_COLUMNS}`,
          [...baseParams, payload.isActive !== false],
        )
      : await query(
          `UPDATE menu_items
           SET category = $2,
               subcategory = $3,
               name = $4,
               description = $5,
               price = $6,
               delivery_price = $7,
               sizes = $8,
               min_order_qty = $9,
               image_base64 = $10,
               is_active = $11
           WHERE id = $1
           RETURNING ${MENU_ITEM_COLUMNS}`,
          [...baseParams, payload.image, payload.isActive !== false],
        )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Produto nao encontrado' })
    }

    return res.json(formatMenuItemForList(result.rows[0], { includeImages: true }))
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar produto', detail: error.message })
  }
})

app.patch('/menu-items/:id/active', async (req, res) => {
  const itemId = Number(req.params.id)
  if (!Number.isInteger(itemId)) {
    return res.status(400).json({ message: 'ID invalido' })
  }

  const isActive =
    typeof req.body?.isActive === 'boolean'
      ? req.body.isActive
      : typeof req.body?.active === 'boolean'
        ? req.body.active
        : req.body?.isActive !== false && req.body?.active !== false

  try {
    const result = await query(
      `UPDATE menu_items SET is_active = $2 WHERE id = $1 RETURNING ${MENU_ITEM_COLUMNS}`,
      [itemId, isActive],
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Produto nao encontrado' })
    }
    return res.json(normalizeMenuItemRow(result.rows[0]))
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar status', detail: error.message })
  }
})

app.delete('/menu-items/:id', async (req, res) => {
  const itemId = Number(req.params.id)
  if (!Number.isInteger(itemId)) {
    return res.status(400).json({ message: 'ID invalido' })
  }

  try {
    const result = await query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [itemId])
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Produto nao encontrado' })
    }
    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao remover produto', detail: error.message })
  }
})

const APP_RELEASE = process.env.APP_RELEASE || 'dev'

app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1')
    res.json({
      ok: true,
      message: 'API e banco conectados',
      release: APP_RELEASE,
    })
  } catch {
    res.status(500).json({ ok: false, message: 'Falha na conexao com banco', release: APP_RELEASE })
  }
})

function parseTableNumberFromBody(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function normalizePhoneDigits(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('55')) return digits
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`
  return digits
}

const ORDER_RETURNING = `id, table_number AS "tableNumber", order_type AS "orderType",
  customer_name AS "customerName", customer_phone AS "customerPhone",
  customer_cep AS "customerCep", delivery_address AS "deliveryAddress",
  delivery_reference AS "deliveryReference", delivery_distance_km AS "deliveryDistanceKm",
  items_subtotal AS "itemsSubtotal", delivery_fee AS "deliveryFee",
  payment_method AS "paymentMethod", payment_change_for AS "paymentChangeFor",
  observation, total_amount AS "totalAmount", status, created_at AS "createdAt"`

const ALLOWED_PAYMENT_METHODS = new Set(['pix', 'cash', 'credit', 'debit'])

function parsePaymentChangeFor(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return Math.round(numeric * 100) / 100
}

function validateDeliveryPayment({ paymentMethod, paymentChangeFor, totalAmount }) {
  const method = String(paymentMethod ?? '').trim()
  if (!ALLOWED_PAYMENT_METHODS.has(method)) {
    return { ok: false, message: 'Selecione a forma de pagamento' }
  }
  if (method === 'cash') {
    const changeFor = parsePaymentChangeFor(paymentChangeFor)
    if (changeFor == null) {
      return { ok: false, message: 'Informe para quanto precisa de troco (valor em dinheiro)' }
    }
    const total = Number(totalAmount)
    if (Number.isFinite(total) && changeFor + 0.009 < total) {
      return {
        ok: false,
        message: 'O valor para troco deve ser igual ou maior que o total do pedido',
      }
    }
    return { ok: true, paymentMethod: method, paymentChangeFor: changeFor }
  }
  return { ok: true, paymentMethod: method, paymentChangeFor: null }
}

function resolveOrderType(tableNumber, requestedType) {
  if (requestedType === 'delivery') return 'delivery'
  if (requestedType === 'table' && tableNumber) return 'table'
  return tableNumber ? 'table' : 'delivery'
}

function validateDeliveryFields({
  customerName,
  customerPhone,
  deliveryAddress,
  deliveryReference,
  paymentMethod,
  paymentChangeFor,
  totalAmount,
}) {
  if (!customerName) {
    return { ok: false, message: 'Informe o nome para delivery' }
  }
  if (customerPhone.length < 12) {
    return { ok: false, message: 'Informe um WhatsApp valido com DDD' }
  }
  if (!deliveryAddress) {
    return { ok: false, message: 'Informe o endereco de entrega' }
  }
  if (!deliveryReference) {
    return { ok: false, message: 'Informe o ponto de referencia' }
  }
  const payment = validateDeliveryPayment({ paymentMethod, paymentChangeFor, totalAmount })
  if (!payment.ok) {
    return payment
  }
  return { ok: true, paymentMethod: payment.paymentMethod, paymentChangeFor: payment.paymentChangeFor }
}

app.post('/orders', async (req, res) => {
  const { observation, items } = req.body
  const tableNumber = parseTableNumberFromBody(req.body.mesa ?? req.body.tableNumber)
  const orderType = resolveOrderType(tableNumber, req.body.orderType)
  const itemsSubtotal = Number(req.body.itemsSubtotal ?? 0)
  const deliveryFee = orderType === 'delivery' ? Math.max(0, Number(req.body.deliveryFee ?? 0)) : 0

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Pedido precisa ter itens' })
  }

  try {
    const minQtyCheck = await validateOrderItemsMinQty(query, items)
    if (!minQtyCheck.ok) {
      return res.status(400).json({ message: minQtyCheck.message })
    }
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao validar quantidade minima',
      detail: error.message,
    })
  }

  if (orderType === 'table' && !tableNumber) {
    return res.status(400).json({ message: 'Informe o numero da mesa' })
  }

  let customerName = ''
  let customerPhone = ''
  let customerCep = ''
  let deliveryAddress = ''
  let deliveryReference = ''
  let deliveryDistanceKm = null
  let resolvedDeliveryFee = deliveryFee
  let paymentMethod = ''
  let paymentChangeFor = null

  if (orderType === 'delivery') {
    customerName = String(req.body.customerName ?? '').trim()
    customerPhone = normalizePhoneDigits(req.body.customerPhone)
    customerCep = normalizeCepDigits(req.body.customerCep ?? req.body.cep)
    deliveryReference = String(req.body.deliveryReference ?? '').trim()

    const customerPayload = {
      cep: customerCep,
      street: req.body.deliveryStreet ?? req.body.street,
      number: req.body.deliveryNumber ?? req.body.number,
      neighborhood: req.body.deliveryNeighborhood ?? req.body.neighborhood,
      city: req.body.deliveryCity ?? req.body.city,
      state: req.body.deliveryState ?? req.body.state,
    }

    deliveryAddress =
      String(req.body.deliveryAddress ?? '').trim() ||
      composeDeliveryAddress(customerPayload)

    const totalAmountPreview = Number(req.body.totalAmount ?? itemsSubtotal + deliveryFee)

    const check = validateDeliveryFields({
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryReference,
      paymentMethod: req.body.paymentMethod,
      paymentChangeFor: req.body.paymentChangeFor,
      totalAmount: totalAmountPreview,
    })
    if (!check.ok) {
      return res.status(400).json({ message: check.message })
    }
    paymentMethod = check.paymentMethod
    paymentChangeFor = check.paymentChangeFor

    const settings = await loadCatalogSettings(query)

    if (usesKmDeliveryPricing(settings)) {
      if (customerCep.length !== 8) {
        return res.status(400).json({ message: 'Informe o CEP de entrega' })
      }

      try {
        const quote = await quoteDeliveryFee(settings, customerPayload)
        resolvedDeliveryFee = quote.fee
        deliveryDistanceKm = quote.distanceKm

        if (Math.abs(resolvedDeliveryFee - deliveryFee) > 0.02) {
          return res.status(400).json({
            message: 'Taxa de entrega desatualizada. Atualize o carrinho e tente de novo.',
          })
        }
      } catch (quoteError) {
        return res.status(400).json({
          message: quoteError.message || 'Nao foi possivel calcular taxa de entrega',
        })
      }
    } else {
      resolvedDeliveryFee = Math.max(0, Number(settings.deliveryFee) || 0)
      if (Math.abs(resolvedDeliveryFee - deliveryFee) > 0.02) {
        return res.status(400).json({
          message: 'Taxa de entrega desatualizada. Atualize o carrinho e tente de novo.',
        })
      }
    }
  }

  const totalAmount = Number(req.body.totalAmount ?? itemsSubtotal + resolvedDeliveryFee)

  try {
    const orderResult = await query(
      `INSERT INTO orders (
         table_number, order_type, customer_name, customer_phone, customer_cep,
         delivery_address, delivery_reference, delivery_distance_km,
         items_subtotal, delivery_fee, payment_method, payment_change_for,
         observation, total_amount
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING ${ORDER_RETURNING}`,
      [
        orderType === 'table' ? tableNumber : null,
        orderType,
        customerName,
        customerPhone,
        customerCep,
        deliveryAddress,
        deliveryReference,
        deliveryDistanceKm,
        itemsSubtotal,
        resolvedDeliveryFee,
        paymentMethod,
        paymentChangeFor,
        observation ?? '',
        totalAmount,
      ],
    )

    const order = orderResult.rows[0]

    const insertItemPromises = items.map((item) =>
      query(
        `INSERT INTO order_items (order_id, item_id, item_name, category, subcategory, quantity, unit_price, size_id, size_label)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id,
          Number(item.id ?? 0),
          item.name ?? 'Item',
          item.category ?? 'pizzas',
          item.subcategory ?? '',
          Number(item.qty ?? 1),
          Number(item.price ?? 0),
          item.sizeId ?? '',
          item.sizeLabel ?? '',
        ],
      ),
    )

    await Promise.all(insertItemPromises)
    return res.status(201).json(order)
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao salvar pedido', detail: error.message })
  }
})

function parseDateQuery(value, fallback) {
  const raw = String(value || fallback || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback
  return raw
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

app.get('/orders/report', async (req, res) => {
  const today = todayIsoDate()
  const from = parseDateQuery(req.query.from, today)
  const to = parseDateQuery(req.query.to, from)

  try {
    const result = await query(
      `SELECT ${ORDER_RETURNING}
       FROM orders
       WHERE created_at::date >= $1::date
         AND created_at::date <= $2::date
       ORDER BY created_at DESC`,
      [from, to],
    )

    const orders = result.rows
    const soldOrders = orders.filter((order) => order.status !== 'cancelled')
    const cancelledOrders = orders.filter((order) => order.status === 'cancelled')

    const sumTotal = (list) =>
      list.reduce((acc, order) => acc + (Number(order.totalAmount) || 0), 0)

    return res.json({
      from,
      to,
      summary: {
        soldCount: soldOrders.length,
        soldTotal: sumTotal(soldOrders),
        cancelledCount: cancelledOrders.length,
        cancelledTotal: sumTotal(cancelledOrders),
      },
      orders,
      soldOrders,
      cancelledOrders,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao gerar relatorio', detail: error.message })
  }
})

app.get('/orders', async (req, res) => {
  const from = req.query.from
  const to = req.query.to

  try {
    if (from && to) {
      const fromDate = parseDateQuery(from, todayIsoDate())
      const toDate = parseDateQuery(to, fromDate)
      const result = await query(
        `SELECT ${ORDER_RETURNING}
         FROM orders
         WHERE created_at::date >= $1::date
           AND created_at::date <= $2::date
         ORDER BY created_at DESC`,
        [fromDate, toDate],
      )
      return res.json(result.rows)
    }

    const result = await query(
      `SELECT ${ORDER_RETURNING}
       FROM orders
       ORDER BY created_at DESC
       LIMIT 200`,
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar pedidos', detail: error.message })
  }
})

app.get('/orders/:id/items', async (req, res) => {
  const orderId = Number(req.params.id)
  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ message: 'ID invalido' })
  }

  try {
    const result = await query(
      `SELECT id, item_id AS "itemId", item_name AS "itemName", category, quantity, unit_price AS "unitPrice", size_id AS "sizeId", size_label AS "sizeLabel"
       FROM order_items
       WHERE order_id = $1
       ORDER BY id`,
      [orderId],
    )
    return res.json(result.rows)
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar itens', detail: error.message })
  }
})

app.patch('/orders/:id', async (req, res) => {
  const orderId = Number(req.params.id)
  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ message: 'ID invalido' })
  }

  const tableNumber = parseTableNumberFromBody(req.body.mesa ?? req.body.tableNumber)
  const orderType = resolveOrderType(tableNumber, req.body.orderType)

  let customerName = String(req.body.customerName ?? '').trim()
  let customerPhone = normalizePhoneDigits(req.body.customerPhone)
  let deliveryAddress = String(req.body.deliveryAddress ?? '').trim()
  let deliveryReference = String(req.body.deliveryReference ?? '').trim()
  let paymentMethod = ''
  let paymentChangeFor = null

  if (orderType === 'delivery') {
    const existing = await query(
      `SELECT total_amount AS "totalAmount" FROM orders WHERE id = $1`,
      [orderId],
    )
    const totalAmount =
      Number(req.body.totalAmount) ||
      Number(existing.rows[0]?.totalAmount) ||
      0

    const check = validateDeliveryFields({
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryReference,
      paymentMethod: req.body.paymentMethod,
      paymentChangeFor: req.body.paymentChangeFor,
      totalAmount,
    })
    if (!check.ok) {
      return res.status(400).json({ message: check.message })
    }
    paymentMethod = check.paymentMethod
    paymentChangeFor = check.paymentChangeFor
  } else {
    if (!tableNumber) {
      return res.status(400).json({ message: 'Informe o numero da mesa' })
    }
    customerName = ''
    customerPhone = ''
    deliveryAddress = ''
    deliveryReference = ''
    paymentMethod = ''
    paymentChangeFor = null
  }

  try {
    const result = await query(
      `UPDATE orders
       SET table_number = $2,
           order_type = $3,
           customer_name = $4,
           customer_phone = $5,
           delivery_address = $6,
           delivery_reference = $7,
           payment_method = $8,
           payment_change_for = $9
       WHERE id = $1
       RETURNING ${ORDER_RETURNING}`,
      [
        orderId,
        orderType === 'table' ? tableNumber : null,
        orderType,
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryReference,
        paymentMethod,
        paymentChangeFor,
      ],
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Pedido nao encontrado' })
    }

    return res.json(result.rows[0])
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar pedido', detail: error.message })
  }
})

app.patch('/orders/:id/status', async (req, res) => {
  const orderId = Number(req.params.id)
  const { status } = req.body

  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ message: 'ID invalido' })
  }

  const allowed = ['pending', 'printed', 'preparing', 'done', 'cancelled']
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Status invalido' })
  }

  try {
    const result = await query(
      `UPDATE orders
       SET status = $2
       WHERE id = $1
       RETURNING ${ORDER_RETURNING}`,
      [orderId, status],
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Pedido nao encontrado' })
    }

    return res.json(result.rows[0])
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar status', detail: error.message })
  }
})

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../dist')

  const redirectLegacyAdmin = (_req, res) => {
    res.redirect(301, '/admin/ralfs')
  }
  app.get('/admin', redirectLegacyAdmin)
  app.get('/admin/', redirectLegacyAdmin)
  app.get('/acesso-admin-ralfs-2026', redirectLegacyAdmin)

  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )
  app.get(/^(?!\/(health|categories|menu-items|orders|settings|delivery)(\/|$)).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API PizzaRalfs rodando em http://localhost:${PORT}`)
})

