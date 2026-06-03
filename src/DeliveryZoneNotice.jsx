import { DELIVERY_CONSULT_AREAS, isOutskirtDeliveryAddress } from './delivery.js'

export function DeliveryZoneNotice({ configuredDeliveryFee = 0, address = '' }) {
  const fee = Math.max(0, Number(configuredDeliveryFee) || 0)
  const outskirt = isOutskirtDeliveryAddress(address)
  const feeLabel = `R$ ${fee.toFixed(2).replace('.', ',')}`

  return (
    <div className="delivery-zone-notice" role="note">
      <p className="delivery-zone-notice-title">Área de entrega</p>
      <p>
        No <strong>perímetro urbano</strong>, a taxa de entrega é o valor fixo:{' '}
        <strong>{feeLabel}</strong>.
      </p>
      <p>Para os locais abaixo, <strong>consulte-nos</strong> para saber o valor da entrega:</p>
      <ul className="delivery-zone-notice-list">
        {DELIVERY_CONSULT_AREAS.map((area) => (
          <li key={area}>{area}</li>
        ))}
      </ul>
      {outskirt && (
        <p className="delivery-zone-notice-warn">
          Seu endereço parece estar em uma dessas regiões. A taxa será confirmada pelo
          restaurante após o pedido.
        </p>
      )}
    </div>
  )
}
