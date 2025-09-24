document.addEventListener("DOMContentLoaded", () => {
  const cartContainer = document.querySelector(".cart-cards");
  const cartBadge = document.getElementById("cart-badge");

  // load initial badge
  loadCartCount();

  // ONE delegated listener for all inc/dec/remove buttons
  if (cartContainer) {
    cartContainer.addEventListener("click", async (e) => {
      const incBtn = e.target.closest(".inc-btn");
      const decBtn = e.target.closest(".dec-btn");
      const removeBtn = e.target.closest(".remove-btn");

      if (incBtn) {
        await handleInc(incBtn);
      } else if (decBtn) {
        await handleDec(decBtn);
      } else if (removeBtn) {
        await handleRemove(removeBtn);
      }
    });
  }

  async function handleInc(button) {
    if (button.dataset.processing) return;
    button.dataset.processing = "1";
    button.disabled = true;
    const productId = button.dataset.id;
    try {
      const res = await fetch(`/cart/inc/${productId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.message || res.statusText || "Could not increment item");
        return;
      }
      const qtyEl = document.getElementById(`quantity-${productId}`);
      const totalEl = document.getElementById(`total-${productId}`);
      if (qtyEl) qtyEl.textContent = data.updatedQuantity;
      if (totalEl) totalEl.textContent = `Total: Rs ${data.totalPrice}`;
      updateBadgeFromResponse(data);
    } catch (err) {
      console.error("Increment error:", err);
      alert("Error increasing quantity");
    } finally {
      button.dataset.processing = "";
      button.disabled = false;
    }
  }

  async function handleDec(button) {
    if (button.dataset.processing) return;
    button.dataset.processing = "1";
    button.disabled = true;
    const productId = button.dataset.id;
    try {
      const res = await fetch(`/cart/dec/${productId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.message || res.statusText || "Could not decrement item");
        return;
      }
      if (data.updatedQuantity > 0) {
        updateUI(productId, data.updatedQuantity, data.totalPrice);
      } else {
        const card = document.getElementById(`cart-card-${productId}`);
        if (card) card.remove();
      }
      updateBadgeFromResponse(data);
    } catch (err) {
      console.error("Decrement error:", err);
      alert("Error decreasing quantity");
    } finally {
      button.dataset.processing = "";
      button.disabled = false;
    }
  }

  async function handleRemove(button) {
    if (button.dataset.processing) return;
    button.dataset.processing = "1";
    button.disabled = true;
    const productId = button.dataset.id;
    try {
      const res = await fetch(`/cart/remove/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // If another concurrent request already removed the item, server may respond 404.
        // Handle that gracefully:
        if (res.status === 404 && data && data.message && data.message.includes("not found")) {
          // item was probably already removed by the other request — remove card in UI quietly:
          const card = button.closest(".cart-card");
          if (card) card.remove();
          // fetch fresh counts
          await loadCartCount();
          return;
        }
        alert(data?.message || res.statusText || "Something went wrong while removing the item.");
        return;
      }

      if (data.updatedQuantity > 0) {
        const quantityElem = button.closest(".cart-card").querySelector(".item-quantity");
        if (quantityElem) quantityElem.textContent = data.updatedQuantity;
      } else {
        const card = button.closest(".cart-card");
        if (card) card.remove();
      }
      updateBadgeFromResponse(data);
    } catch (err) {
      console.error("Remove error:", err);
      alert("Something went wrong while removing the item.");
    } finally {
      button.dataset.processing = "";
      button.disabled = false;
    }
  }

  // small helper used earlier
  const updateUI = (productId, newQuantity, newTotal) => {
    const quantityEl = document.getElementById(`quantity-${productId}`);
    const totalEl = document.getElementById(`total-${productId}`);
    if (quantityEl) quantityEl.textContent = newQuantity;
    if (totalEl) totalEl.textContent = `Total: Rs ${newTotal}`;
  };

  // update the visual badge using server-provided counts (prefers total qty)
function updateBadgeFromResponse(data) {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  // ✅ Use unique count instead of total quantity
  const count = data.cartCountUnique ?? data.uniqueCount ?? 0;
  badge.textContent = count > 0 ? count : "0";
}


  // load initial cart count
async function loadCartCount() {
  try {
    const res = await fetch("/cart/count");
    const data = await res.json();
    const badge = document.getElementById("cart-badge");
    if (!badge || !data) return;

    // ✅ Show unique items count
    const count = data.uniqueCount ?? 0;
    badge.textContent = count > 0 ? count : "0";
  } catch (err) {
    console.error("Error loading cart count:", err);
  }
}


  // expose addToCart if used inline
  window.addToCart = async function (productId) {
    try {
      const res = await fetch(`/cart/add/${productId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.message || "Could not add to cart");
        return;
      }
      updateBadgeFromResponse(data);
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert("Error adding to cart");
    }
  };
});
