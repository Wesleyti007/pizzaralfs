import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import {
  loadCategoriesFromDb,
  normalizeCategories,
  saveCategoriesToDb,
} from './categories.js'
import { query } from './db.js'

dotenv.config()

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

app.get('/menu-items', async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, category, subcategory, name, description, price, image_base64 AS image
       FROM menu_items
       ORDER BY id DESC`,
    )
    return res.json(result.rows)
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar produtos', detail: error.message })
  }
})

app.post('/menu-items', async (req, res) => {
  const { category, subcategory, name, description, price, image } = req.body

  if (!name || Number.isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ message: 'Dados invalidos para o produto' })
  }

  try {
    const result = await query(
      `INSERT INTO menu_items (category, subcategory, name, description, price, image_base64)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, category, subcategory, name, description, price, image_base64 AS image`,
      [
        category || 'pizzas',
        subcategory || '',
        name.trim(),
        description || '',
        Number(price),
        image || '',
      ],
    )
    return res.status(201).json(result.rows[0])
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao criar produto', detail: error.message })
  }
})

app.put('/menu-items/:id', async (req, res) => {
  const itemId = Number(req.params.id)
  const { category, subcategory, name, description, price, image } = req.body

  if (!Number.isInteger(itemId)) {
    return res.status(400).json({ message: 'ID invalido' })
  }

  if (!name || Number.isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ message: 'Dados invalidos para o produto' })
  }

  try {
    const result = await query(
      `UPDATE menu_items
       SET category = $2,
           subcategory = $3,
           name = $4,
           description = $5,
           price = $6,
           image_base64 = $7
       WHERE id = $1
       RETURNING id, category, subcategory, name, description, price, image_base64 AS image`,
      [
        itemId,
        category || 'pizzas',
        subcategory || '',
        name.trim(),
        description || '',
        Number(price),
        image || '',
      ],
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Produto nao encontrado' })
    }

    return res.json(result.rows[0])
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar produto', detail: error.message })
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

app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1')
    res.json({ ok: true, message: 'API e banco conectados' })
  } catch {
    res.status(500).json({ ok: false, message: 'Falha na conexao com banco' })
  }
})

app.post('/orders', async (req, res) => {
  const { mesa, observation, items, totalAmount } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Pedido precisa ter itens' })
  }

  try {
    const orderResult = await query(
      `INSERT INTO orders (table_number, observation, total_amount)
       VALUES ($1, $2, $3)
       RETURNING id, table_number AS "tableNumber", observation, total_amount AS "totalAmount", created_at AS "createdAt"`,
      [mesa ?? null, observation ?? '', Number(totalAmount ?? 0)],
    )

    const order = orderResult.rows[0]

    const insertItemPromises = items.map((item) =>
      query(
        `INSERT INTO order_items (order_id, item_id, item_name, category, subcategory, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          order.id,
          Number(item.id ?? 0),
          item.name ?? 'Item',
          item.category ?? 'pizzas',
          item.subcategory ?? '',
          Number(item.qty ?? 1),
          Number(item.price ?? 0),
        ],
      ),
    )

    await Promise.all(insertItemPromises)
    return res.status(201).json(order)
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao salvar pedido', detail: error.message })
  }
})

app.get('/orders', async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, table_number AS "tableNumber", observation, total_amount AS "totalAmount", status, created_at AS "createdAt"
       FROM orders
       ORDER BY created_at DESC
       LIMIT 100`,
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
      `SELECT id, item_id AS "itemId", item_name AS "itemName", category, quantity, unit_price AS "unitPrice"
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

app.patch('/orders/:id/status', async (req, res) => {
  const orderId = Number(req.params.id)
  const { status } = req.body

  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ message: 'ID invalido' })
  }

  if (!['pending', 'preparing', 'done', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Status invalido' })
  }

  try {
    const result = await query(
      `UPDATE orders
       SET status = $2
       WHERE id = $1
       RETURNING id, status`,
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

app.listen(PORT, () => {
  console.log(`API PizzaRalfs rodando em http://localhost:${PORT}`)
})

