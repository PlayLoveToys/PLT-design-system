# Adapters Liquid (`plt-*.liquid`)

Snippets que el tema PlayLoveToys/PLT-liquid-theme copia a `snippets/` con
`npm run sync:plt`. Cada uno documenta su contrato en el bloque `{% doc %}`.

## `plt-navbar.liquid` (DS#4)

**Elemento:** `<plt-navbar>` — comportamiento de menú móvil, mega menú,
`aria-expanded` / `aria-controls`, Escape y foco (ver
`packages/design-system/contracts/components.md`).

### Por qué `plt-navbar` y no `plt-header`

Coincide con el custom element, el renderer `navbar.liquid` del design system y
el glob `plt-*.liquid` que sincroniza el theme. El `<header class="plt-navbar">`
sigue siendo la anatomía; el snippet es el **puerto Shopify** hacia ese contrato.

### Parámetros principales

| Parámetro | Obligatorio | Descripción |
| --- | --- | --- |
| `site_name` | sí | Marca / nombre de la tienda |
| `links` | uno de `links` o `menu` | Array contrato: `{ label, url, current?, columns? }`. `columns` sigue MegaMenu. |
| `menu` | uno de `links` o `menu` | `linklists` de Shopify (3 niveles → mega menú) |
| `logo_url`, `logo_alt`, `home_url` | no | Identidad visual |
| `actions`, `mobile_actions` | no | HTML inyectado en acciones (escritorio / móvil) |
| `localization_slot` | no | Bloque del tema con `{% form 'localization' %}` ya resuelto |
| `countries`, `languages` | no | Contrato MarketSelector; renderiza `plt-market-selector` |
| `show_search`, `show_account`, `show_cart` | no | Acciones prefabricadas |
| `cart_item_count` | no | Contador; fallback `cart.item_count` |
| `cart_drawer_id` | no | `aria-controls` del botón carrito (default `plt-cart-drawer`) |
| `hover_delay`, `publish_height` | no | Opt-in del WC |
| `script_url` | no | Bundle; `'none'` si otro snippet ya lo cargó |

### Burbuja del carrito

El botón carrito incluye:

```html
<span id="plt-cart-bubble-count" data-plt-cart-count>…</span>
```

Tras mutar el carrito (p. ej. escuchando `plt:cart-line-change` en
`plt-cart-drawer`), el tema actualiza el texto o el `textContent` de ese nodo.
El demo usa el mismo patrón con `[data-cart-open]`.

### Eventos DOM (no configurables en Liquid)

| Evento | `detail` |
| --- | --- |
| `plt:navbar-toggle` | `{ open: boolean }` |
| `plt:megamenu-toggle` | `{ id: string, open: boolean }` |
| `plt:navbar-overflow` | `{ hidden: string[] }` (solo con markup overflow) |

### Snippets relacionados

- `plt-megamenu.liquid` — panel mega menú (contrato o `child_links` Shopify)
- `plt-market-selector.liquid` — selector mercado/idioma
- `plt-cart-drawer.liquid` — cajón del carrito enlazado vía `cart_drawer_id`
- `plt-web-components.liquid` — carga del bundle en páginas sin otros adapters

### Ejemplo en el theme (sin subir pin aquí)

```liquid
{% render 'plt-navbar',
  site_name: shop.name,
  logo_url: settings.logo | image_url: width: 200,
  menu: linklists.main-menu,
  countries: localization.available_countries,
  languages: localization.available_languages,
  show_search: true,
  show_cart: true,
  cart: cart,
  script_url: 'none'
%}
{% render 'plt-cart-drawer', cart: cart %}
{% render 'plt-web-components' %}
```

Con datos ya normalizados (metafields del theme):

```liquid
{% render 'plt-navbar', site_name: shop.name, links: section.settings.nav_links, actions: custom_actions %}
```

### Consumo en PLT-liquid-theme

1. Fijar commit de `@playlovetoys/platform` / design-system.
2. `npm install` y `npm run sync:plt` (copia `plt-*.liquid` → `snippets/`).
3. Sustituir el header actual por `{% render 'plt-navbar', … %}`.
4. Mantener el JS del theme que escucha `plt:cart-line-change` y actualiza
   `#plt-cart-bubble-count` (o `querySelector('[data-plt-cart-count]')`).
5. Para localización Shopify, pasar `localization_slot` con el `form` del theme
   o mapear `countries` / `languages` antes del render.