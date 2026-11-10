// Tiny three-page shop used by browser-check.mjs. Includes hostile global CSS on purpose
// to prove the tooltip is isolated from the host page's styles.
const head = (
  sdkUrl,
  key,
) => `<!doctype html><html><head><meta charset="utf-8"><title>Test shop</title>
<style>
  * { font-family: "Comic Sans MS", cursive !important; color: #c00 !important; }
  button, input { font-size: 18px; padding: 8px; }
  body { margin: 0; padding: 24px; } header { display: flex; justify-content: space-between; }
  .spacer { height: 1600px; }
</style>
<script>window.ProductTourConfig = { projectId: ${JSON.stringify(key)} };</script>
<script async src="${sdkUrl}"></script></head><body>
<header><a href="/">Test shop</a><button data-tour-id="cart-icon">Cart (1)</button></header>`;

export function page(path, sdkUrl, key) {
  const h = head(sdkUrl, key);
  if (path === "/")
    return `${h}<main><input data-tour-id="search-input" placeholder="Search products">
      <div class="spacer"></div>
      <a data-tour-id="product-card-aurora-headphones" href="/products/aurora-headphones">Aurora headphones — $99</a>
      </main></body></html>`;
  if (path === "/products/aurora-headphones")
    return `${h}<main><h1>Aurora headphones</h1><button data-tour-id="add-to-cart">Add to cart</button></main></body></html>`;
  if (path === "/cart")
    return `${h}<main><h1>Your cart</h1><button data-tour-id="checkout-button">Checkout</button></main></body></html>`;
  return null;
}
