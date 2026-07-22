import { resourceLabels, sellItems, shopItems } from '../game/content'
import {
  availableResourceAmount,
  canBuyShopItem,
  canSellShopItem,
  isResourceDiscovered,
  shopItemCooldownMs,
  shopItemCooldownRemainingMs,
} from '../game/engine'
import { formatAmount, formatDuration } from '../game/format'
import type { GameState, ResourceId } from '../game/types'
import { PixelIcon } from './GameIcons'

type ShopPageProps = {
  state: GameState
  onBuy: (resourceId: ResourceId) => void
  onSell: (resourceId: ResourceId) => void
}

export default function ShopPage({ state, onBuy, onSell }: ShopPageProps) {
  return (
    <section className="shop-page" aria-label="Foundry Scrip shop">
      <div className="shop-head">
        <div>
          <p className="eyebrow">Foundry Scrip</p>
          <h2>Factory Shop</h2>
        </div>
        <strong>{formatAmount(state.scrip)} Scrip</strong>
      </div>
      <p className="shop-note">Only discovered resources and parts can be bought. Tools and machines are never sold here.</p>
      <div className="shop-section">
        <h3>Buy parts</h3>
        <div className="shop-grid">
          {shopItems.map((item) => {
            const discovered = isResourceDiscovered(state, item.id)
            const canBuy = canBuyShopItem(state, item)
            const cooldownMs = shopItemCooldownMs(item)
            const cooldownRemainingMs = shopItemCooldownRemainingMs(state, item)
            return (
              <article className={discovered ? 'shop-card' : 'shop-card locked'} key={`buy-${item.id}`}>
                <span className="item-slot filled"><PixelIcon id={item.id} /></span>
                <div>
                  <strong>{resourceLabels[item.id]}</strong>
                  <span>{item.age === 'gettingStarted' ? 'Getting Started' : item.age === 'steamAge' ? 'Steam Age' : 'LV Age'}</span>
                  {cooldownMs > 0 && (
                    <span className="shop-cooldown">
                      {cooldownRemainingMs > 0 ? `Part cooldown ${formatDuration(cooldownRemainingMs)}` : `Part cooldown ${formatDuration(cooldownMs)}`}
                    </span>
                  )}
                </div>
                <button type="button" disabled={!canBuy} onClick={() => onBuy(item.id)}>
                  {!discovered ? 'Undiscovered' : cooldownRemainingMs > 0 ? `Wait ${formatDuration(cooldownRemainingMs)}` : `${formatAmount(item.buyPrice)} Scrip`}
                </button>
              </article>
            )
          })}
        </div>
      </div>
      <div className="shop-section">
        <h3>Sell gathered materials</h3>
        <div className="shop-grid">
          {sellItems.map((item) => {
            const owned = availableResourceAmount(state, item.id)
            return (
              <article className="shop-card sell-card" key={`sell-${item.id}`}>
                <span className="item-slot filled">
                  <PixelIcon id={item.id} />
                  <span className="item-count">{formatAmount(owned)}</span>
                </span>
                <div>
                  <strong>{resourceLabels[item.id]}</strong>
                  <span>Sell 1 for {formatAmount(item.sellPrice)} Scrip</span>
                </div>
                <button type="button" disabled={!canSellShopItem(state, item)} onClick={() => onSell(item.id)}>Sell</button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
