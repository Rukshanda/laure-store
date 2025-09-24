document.addEventListener("DOMContentLoaded", () => {
  const removeButtons = document.querySelectorAll(".remove-item-btn");
  const cartBadge = document.getElementById("cart-badge");

  removeButtons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();

      const productId = button.getAttribute("data-id");
      console.log("Product ID:", productId); // Debugging

      if (!productId) {
        alert("No product ID found!");
        return;
      }

      try {
        const response = await fetch(`/orders/remove/${productId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("Server error response:", text);
          throw new Error("Request failed: " + response.status);
        }

        const data = await response.json();
        console.log("Response data:", data);

        if (data.success) {
          const card = button.closest(".card");

          if (data.quantity === 0) {
            console.log("Removing product card from UI");
            card.remove();
          } else {
            const qtySpan = card.querySelector(".order-quantity");
            if (qtySpan) qtySpan.textContent = `Qty: ${data.quantity}`;
          }

          // ✅ Update the badge instantly
          await updateCartBadge();
        } else {
          alert(data.message || "Error updating order");
        }
      } catch (error) {
        console.error("Error removing item:", error);
      }
    });
  });

  // ✅ Helper to update cart badge without refreshing
  async function updateCartBadge() {
    try {
      const res = await fetch("/cart/count");
      const data = await res.json();
      if (cartBadge) {
        cartBadge.textContent = data.uniqueCount ?? "0";
      }
    } catch (err) {
      console.error("Error updating cart badge:", err);
    }
  }
});
