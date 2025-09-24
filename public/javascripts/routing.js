 
document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", async (e) => {
    const link = e.target.closest("a[data-link]");
    if (!link) return;

    e.preventDefault();
    const url = link.getAttribute("href");

    try {
      const response = await fetch(url, {
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });
      const html = await response.text();

      document.getElementById("main-content").innerHTML = html;
      window.history.pushState({}, "", url);
    } catch (err) {
      console.error("Navigation error:", err);
    }
  });

  window.addEventListener("popstate", () => {
    location.reload();
  });
});

function loadProductDetail(productId) {
  fetch(`/productdetials/${productId}`, {
    headers: {
      "X-Requested-With": "XMLHttpRequest", // identify as AJAX
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load product details");
      }
      return response.text();
    })
    .then((html) => {
      // Replace only the #main-content section dynamically
      document.querySelector("#main-content").innerHTML = html;

      // Scroll to top after content loads
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
    .catch((error) => {
      console.error(error);
      alert("Could not load product details. Please try again.");
    });
}
function goBackToProducts() {
  fetch("/products", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  })
    .then((res) => res.text())
    .then((html) => {
      document.querySelector("#main-content").innerHTML = html;
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
    .catch((err) => {
      console.error(err);
      alert("Failed to load products.");
    });
}



document.addEventListener("DOMContentLoaded", () => {
  // Event delegation for all links with class .filter-link
  document.addEventListener("click", (event) => {
    const target = event.target.closest("a.filter-link");

    if (target) {
      event.preventDefault(); // stop normal navigation
      const url = target.getAttribute("href");

      fetch(url, {
        headers: {
          "X-Requested-With": "XMLHttpRequest"
        }
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to load products");
          return response.text();
        })
        .then((html) => {
          // Replace main-content
          document.querySelector("#main-content").innerHTML = html;

          // **Reinitialize Semantic UI dropdowns**
          $(".ui.dropdown").dropdown();

          // Scroll back to top
          window.scrollTo({ top: 0, behavior: "smooth" });
        })
        .catch((error) => {
          console.error(error);
          alert("Something went wrong while loading products!");
        });
    }
  });
});



document.addEventListener("click", (event) => {
  const target = event.target.closest("a.filter-link");

  if (target) {
    event.preventDefault();
    const url = target.getAttribute("href");

    // Show loading state
    document.querySelector("#main-content").innerHTML = "<p>Loading...</p>";

    fetch(url, {
      headers: { "X-Requested-With": "XMLHttpRequest" }
    })
      .then((response) => response.text())
      .then((html) => {
        document.querySelector("#main-content").innerHTML = html;
        $(".ui.dropdown").dropdown({ action: "nothing" });
      });
  }
});
