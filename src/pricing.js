import {
  computeMultiFlavorPrice,
  getPizzaSizePrice,
  itemHasSizes,
  normalizeFlavorIdList,
} from './catalog.js'
import { resolveDeliveryFee } from './deliveryCep.js'

export function resolveUnitPrice(menuItem, sizeId, forDelivery = false) {
  if (!forDelivery) {
    return getPizzaSizePrice(menuItem, sizeId)
  }

  if (itemHasSizes(menuItem)) {
    const size = menuItem.sizes?.find((entry) => entry.id === sizeId)
    const deliveryPrice = Number(size?.deliveryPrice)
    if (Number.isFinite(deliveryPrice) && deliveryPrice > 0) {
      return deliveryPrice
    }
    return getPizzaSizePrice(menuItem, sizeId)
  }

  const itemDelivery = Number(menuItem?.deliveryPrice)
  if (Number.isFinite(itemDelivery) && itemDelivery > 0) {
    return itemDelivery
  }

  return getPizzaSizePrice(menuItem, sizeId)
}

export function computeMultiFlavorPriceForMode(pizzaItemsById, flavorIds, sizeId, forDelivery) {
  const prices = normalizeFlavorIdList(flavorIds).map((id) => {
    const item = pizzaItemsById.get(id)
    return item ? resolveUnitPrice(item, sizeId, forDelivery) : 0
  })
  return prices.length ? Math.max(...prices) : 0
}

export function calcCartTotals(
  cart,
  { isDelivery, deliveryFee = 0, deliveryCep = '', deliveryAddress = '' } = {},
) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0)
  const fee = isDelivery
    ? resolveDeliveryFee({
        baseFee: deliveryFee,
        cep: deliveryCep,
        address: deliveryAddress,
      })
    : 0
  return {
    subtotal,
    deliveryFee: fee,
    total: subtotal + fee,
  }
}

/** Mantém compatibilidade com código que só usa computeMultiFlavorPrice. */
export { computeMultiFlavorPrice }
