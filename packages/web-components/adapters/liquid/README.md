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

El botón carrito incluye el marcador estable del contador (solo markup; sin
lógica de carrito Shopify en el DS):

```html
<span id="plt-cart-bubble-count" data-plt-cart-count>…</span>
```

**Contrato acordado en PLT-liquid-theme** (PRs del theme #31, #32 y #34): el
theme escucha en `document` el evento `plt:cart-updated` y actualiza
`[data-plt-cart-count]` con `detail.item_count` (también llegan
`detail.total_price` y `detail.cart` en el mismo `detail`).

```js
document.addEventListener("plt:cart-updated", (event) => {
  const count = event.detail.item_count;
  document.querySelectorAll("[data-plt-cart-count]").forEach((node) => {
    node.textContent = String(count);
  });
});
```

`plt:cart-line-change` (y el resto de eventos de línea en `plt-cart-drawer`) es
un evento **secundario** del bridge del theme hacia `/cart/change.js`; no es el
contrato de la burbuja. El adapter no emite ni interpreta `plt:cart-updated`:
solo deja el gancho en el DOM.

El ejemplo interno `examples/shared/store.js` sigue usando un contador local para
el demo; en storefront real el theme es dueño del bridge y del evento.

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
4. Mantener el bridge del theme que dispara `plt:cart-updated` en `document` tras
   cada mutación y actualiza `[data-plt-cart-count]` con `detail.item_count`
   (véase PRs #31, #32, #34 del theme).
5. Para localización Shopify, pasar `localization_slot` con el `form` del theme
   o mapear `countries` / `languages` antes del render.

---

## Adaptadores de componentes interactivos

Todos aceptan `script_url: 'none'` (si otro snippet ya cargó el bundle), traen un
bloque `{% doc %}` y reciben datos **ya normalizados** por el theme: el DS no lee
objetos Shopify ni llama a la Cart API ni a `/search/suggest`.

### `plt-product-gallery.liquid` (DS#21)

**Elemento:** `<plt-product-gallery>`. Reemplaza `snippets/product-media-gallery.liquid`.

| Parámetro | Descripción |
| --- | --- |
| `media` | Array normalizado: `{ url, alt?, width?, height?, media_type?, thumbnail_url?, thumbnail_width?, thumbnail_height?, srcset?, sizes?, id?, video_url?, embed_url?, poster_url? }`. `media_type`: `image` (default), `video`, `external_video`, `model`. |
| `title` | Texto alt de reserva |
| `selected_media_id` | `id` del medio visible al inicio |
| `zoom` | Activa zoom por hover + lightbox en imágenes |
| `thumb_label`, `zoom_label`, `close_label`, `prev_label`, `next_label` | Etiquetas |

Sin JS se ve el medio seleccionado y una lista `data-plt-fallback` con enlaces a
las demás imágenes (el elemento la retira al registrarse). `data-media-id` permite
`gallery.selectMedia(id)` al cambiar de variante. Evento: `plt:gallery-change`.

```liquid
{% liquid
  assign media_items = '[]' | parse_json
%}
{% render 'plt-product-gallery', media: media_items, title: product.title, zoom: true, script_url: 'none' %}
```

### `plt-quick-view.liquid` y `plt-cart-line.liquid` (DS#22)

- **`plt-quick-view`**: `url` (destino sin JS: el disparador es un enlace a la
  página de producto), `content` (HTML ya renderizado del cuerpo del diálogo),
  `id`, `title`, `trigger_label`, `trigger_class`, `close_label`. Eventos:
  `plt:quick-view-open` / `plt:quick-view-close`.
- **`plt-cart-line`**: `line` = `{ id, title, price, quantity, url?, image_url?,
  image_alt?, variant_title?, compare_at_price?, max_quantity?, index? }` (precios
  ya formateados con `money`), más etiquetas. Sin JS, formulario `POST` a
  `/cart/change` (`line` = `index`). Eventos que el theme debe escuchar:
  `plt:cart-line-change` (`{ lineId, quantity, previousQuantity }`) y
  `plt:cart-line-remove` (`{ lineId }`); tras llamar a `/cart/change.js` el theme
  vuelve a fijar `line` y limpia `busy`.

### `plt-predictive-search.liquid` (DS#20)

**Elemento:** `<plt-predictive-search>`; contrato en
`packages/design-system/contracts/components.md` (**PredictiveSearch**). Parámetros:
`action` (`routes.search_url`), `name`, `value` (`search.terms`), `placeholder`,
`min_length`, `debounce`, `input_label`, `submit_label`, `loading_label`,
`empty_label`, `count_label`, `view_all_label`, `id`.

El theme es dueño del fetch:

```js
const el = document.getElementById("plt-predictive-search");
let controller;
el.addEventListener("plt:predictive-search-query", async ({ detail }) => {
  controller?.abort(); // drop the stale request
  controller = new AbortController();
  el.loading = true;
  try {
    const params = new URLSearchParams({ q: detail.query, "resources[type]": "product,collection,page,query" });
    const response = await fetch(`${routes.predictive_search_url}.json?${params}`, { signal: controller.signal });
    const { resources } = await response.json();
    el.results = mapSuggestions(resources.results); // → { groups: [...] }
  } catch (error) {
    if (error.name === "AbortError") return;
    el.results = { groups: [] };
  }
  el.loading = false;
});
```

(`mapSuggestions` vive en el theme y convierte `products`, `collections`, `pages`
y `queries` de Shopify en `groups`.)

### Renderers estáticos como snippets sincronizables (DS#23)

`plt-article-card` (EditorialCard), `plt-collection-card`, `plt-swatch`,
`plt-buy-bar` (StickyAddToCart), `plt-prose` (RichText), `plt-trust-bar`,
`plt-link-grid`, `plt-chip-pills`, `plt-location-card`, `plt-newsletter` y
`plt-footer`. Se **generan** desde `packages/design-system/renderers/liquid/` con
`npm run build:adapters` (`npm run check:adapters` falla si están desactualizados):
no se editan a mano. Cada uno es autocontenido (sin `{% render %}` ni `{% include %}`
de otros snippets), tiene `{% doc %}`, escapa los textos y solo deja HTML sin escapar
en `body`, `content`, `icon`, `newsletter` y `legal`, que el theme debe sanear.
