import { useCallback, useRef } from 'react'
import {
  flashOrdersPageTitle,
  isOrderAwaitingPrint,
  notifyNewOrder,
  playNewOrderSound,
} from './orderAlerts.js'

/** Persiste entre remontagens do React (ex.: StrictMode) na mesma aba. */
let sessionKnownOrderIds = null

function getKnownOrderIds() {
  if (!sessionKnownOrderIds) {
    sessionKnownOrderIds = new Set()
  }
  return sessionKnownOrderIds
}

export function useOrderAlerts({ settings, onAutoPrint }) {
  const knownIdsRef = useRef(getKnownOrderIds())
  const printQueueRef = useRef([])
  const printingRef = useRef(false)
  const hasSeededRef = useRef(knownIdsRef.current.size > 0)

  const processPrintQueue = useCallback(async () => {
    if (printingRef.current || !onAutoPrint) return
    const next = printQueueRef.current.shift()
    if (!next) return

    printingRef.current = true
    try {
      await onAutoPrint(next)
    } catch {
      // erro tratado em OrdersPage
    } finally {
      printingRef.current = false
      if (printQueueRef.current.length > 0) {
        void processPrintQueue()
      }
    }
  }, [onAutoPrint])

  const enqueueAutoPrint = useCallback(
    (order) => {
      printQueueRef.current.push(order)
      void processPrintQueue()
    },
    [processPrintQueue],
  )

  const syncOrdersSnapshot = useCallback(
    (orders) => {
      const list = Array.isArray(orders) ? orders : []
      const known = knownIdsRef.current

      if (!hasSeededRef.current) {
        list.forEach((order) => known.add(String(order.id)))
        hasSeededRef.current = true
        return []
      }

      const newcomers = list.filter((order) => !known.has(String(order.id)))
      list.forEach((order) => known.add(String(order.id)))

      const pendingNew = newcomers.filter(isOrderAwaitingPrint)
      if (!pendingNew.length) return []

      if (settings.notifyEnabled) {
        for (const order of pendingNew) {
          notifyNewOrder(order)
        }
      }

      if (settings.soundEnabled) {
        void playNewOrderSound()
        if (!settings.notifyEnabled) {
          const last = pendingNew[pendingNew.length - 1]
          flashOrdersPageTitle(`Novo pedido #${last.id}`)
        }
      }

      if (settings.autoPrintEnabled && settings.printArmed) {
        for (const order of pendingNew) {
          enqueueAutoPrint(order)
        }
      }

      return pendingNew
    },
    [
      settings.autoPrintEnabled,
      settings.notifyEnabled,
      settings.printArmed,
      settings.soundEnabled,
      enqueueAutoPrint,
    ],
  )

  return { syncOrdersSnapshot }
}
