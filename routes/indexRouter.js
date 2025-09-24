const productsModel = require("../models/productsModel");
const usersModel = require("../models/usersModel");
const { generatedToken } = require("../utils/generatedToken");
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const mongoose = require("mongoose");
const isLoggedIn = require("../middleware/isLoggedIn");

//on the index page

router.get("/", (req, res) => {
  const success = req.flash("success"); // Flash for success
  const error = req.flash("error"); // Flash for error

  res.render("index", {
    loggedin: res.locals.loggedin,
    success,
    error,
    layout: res.locals.isAjax ? false : "layouts/layout",
  });
});

// Contact Us

router.get("/products", async (req, res) => {
  try {
    const { badge, category } = req.query;
    let filter = {};

    if (badge) filter.badge = badge;
    if (category) filter.category = category;

    const products = await productsModel.find(filter);

    // Detect if AJAX request
    const isAjax =
      req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest";

    res.render("products", {
      products,
      success: req.flash("success"),
      error: req.flash("error"),
      layout: isAjax ? false : "layouts/layout", // only full layout for non-AJAX
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    req.flash("error", "Failed to fetch products");
    res.redirect("/products");
  }
});

router.get("/cart", isLoggedIn, async (req, res) => {
  let user = await usersModel
    .findOne({ email: req.user.email })
    .populate("cart.product");
  res.render("cart", {
    user,
    layout: res.locals.isAjax ? false : "layouts/layout",
  });
});
// User Profile
router.get("/profile", isLoggedIn, async (req, res) => {
  try {
    let user = await usersModel
      .findOne({ email: req.user.email })
      .populate([
        { path: "cart.product" },
        { path: "orders.product" },
        { path: "placeOrders.product" },
      ]);

    // ✅ Retrieve success message
    const success = req.flash("success");

    console.log("User Profile:");

    // ✅ Pass it to the template
    res.render("userprofile", {
      user,
      success,
      layout: res.locals.isAjax ? false : "layouts/layout",
    });
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).send("Server Error");
  }
});

// Prdouct Details
router.get("/productdetials/:id", isLoggedIn, async (req, res) => {
  try {
    const product = await productsModel.findById(req.params.id);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Detect AJAX request
    const isAjax =
      req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest";

    res.render("productdetail", {
      product,
      layout: isAjax ? false : "layouts/layout", // Disable layout if AJAX
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Checkout
router.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    const user = await usersModel
      .findOne({ email: req.user.email })
      .populate("orders.product"); // populate orders

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/cart");
    }

    // Clean formatted orders
    const orderItems = user.orders
      .filter((order) => order.product) // only valid products
      .map((order) => ({
        id: order.product._id,
        name: order.product.name,
        image: order.product.image,
        price: order.product.price,
        discount: order.product.discount || 0,
        quantity: order.quantity,
        total:
          order.quantity *
          ((order.product.price || 0) - (order.product.discount || 0)),
      }));

    // ✅ Pass flash messages to checkout view
    res.render("checkout", {
      user,
      orderItems,
      success: req.flash("success"),
      error: req.flash("error"),
      layout: res.locals.isAjax ? false : "layouts/layout",
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while loading checkout.");
    res.redirect("/cart");
  }
});

// TO checkout all the products here is the functionality
 router.get("/checkout-all", isLoggedIn, async (req, res) => {
  try {
    const user = await usersModel
      .findOne({ email: req.user.email })
      .populate("cart.product");

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/");
    }

    if (user.cart.length === 0) {
      req.flash("error", "Your cart is empty");
      return res.redirect("/cart");
    }

    // ✅ Copy items from cart to orders (TEMPORARY checkout stage)
    user.cart.forEach((item) => {
      const existingOrder = user.orders.find(
        (order) => order.product.toString() === item.product._id.toString()
      );

      if (existingOrder) {
        existingOrder.quantity += item.quantity;
      } else {
        user.orders.push({
          product: item.product._id,
          quantity: item.quantity,
        });
      }
    });

    // ❌ DO NOT clear cart here
    // user.cart = []; <-- remove this line

    await user.save();

    req.flash(
      "success",
      "Items moved to checkout. Complete your order now!"
    );
    res.redirect("/checkout");
  } catch (err) {
    console.error("Error moving cart items to checkout:", err);
    req.flash("error", "Something went wrong");
    res.redirect("/cart");
  }
});


// helper: compute counts
function getCartCounts(user) {
  const uniqueCount = user.cart.length;
  const qtyCount = user.cart.reduce((s, it) => s + (it.quantity || 0), 0);
  return { uniqueCount, qtyCount };
}

// Add To Cart Functionality
router.post("/cart/add/:id", isLoggedIn, async (req, res) => {
  try {
    const product = await productsModel.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (product.amount <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Product is out of stock" });

    product.amount -= 1;
    await product.save();

    const user = await usersModel.findOne({ email: req.user.email });
    const existingItem = user.cart.find(
      (item) => item.product.toString() === product._id.toString()
    );
    if (existingItem) existingItem.quantity += 1;
    else user.cart.push({ product: product._id, quantity: 1 });

    user.markModified("cart");
    await user.save();

    const counts = getCartCounts(user);
    return res.json({
      success: true,
      message: "Product added to cart",
      cartCountUnique: counts.uniqueCount,
      cartCountQty: counts.qtyCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});
router.get("/cart/count", isLoggedIn, async (req, res) => {
  try {
    const user = await usersModel.findOne({ email: req.user.email });
    if (!user)
      return res.json({ success: true, count: 0, uniqueCount: 0, qtyCount: 0 });

    const { uniqueCount, qtyCount } = getCartCounts(user);
    return res.json({
      success: true,
      count: uniqueCount,
      uniqueCount,
      qtyCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// OrderNow functionality
router.get("/ordernow/:id", isLoggedIn, async (req, res) => {
  try {
    const productId = req.params.id; // ✅ Get product id from URL

    // 1️⃣ Find the logged-in user
    const user = await usersModel.findOne({ email: req.user.email });
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/");
    }

    // 2️⃣ Find the product using the productId
    const product = await productsModel.findById(productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/");
    }

    // 3️⃣ Find the product quantity in cart
    const cartItem = user.cart.find(
      (item) => item.product.toString() === productId
    );
    const quantity = cartItem ? cartItem.quantity : 1;

    // 4️⃣ Push the product into orders array
    user.orders.push({
      product: product._id,
      quantity: quantity, // Use quantity from cart if available
    });

    // 5️⃣ Remove the product from the cart
    user.cart = user.cart.filter(
      (item) => item.product.toString() !== productId
    );

    // 6️⃣ Save the updated user
    await user.save();

    console.log(
      "The product is removed from the cart and added to the orders array"
    );
    req.flash("success", "Ordered successfully");
    res.redirect("/checkout");
  } catch (err) {
    console.error("Error placing order:", err);
    req.flash("error", "Something went wrong");
    res.redirect("/");
  }
});
// Remove (decrement or remove) — robust and returns counts
router.post("/cart/remove/:productId", isLoggedIn, async (req, res) => {
  try {
    const user = await usersModel.findOne({ email: req.user.email });
    const productId = req.params.productId;
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const product = await productsModel.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const cartItem = user.cart.find(
      (item) => item.product.toString() === productId
    );
    if (!cartItem)
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });

    const previousQuantity = cartItem.quantity;

    // restore stock
    product.amount += 1;
    await product.save();

    let newQuantity;
    if (previousQuantity > 1) {
      cartItem.quantity -= 1;
      newQuantity = cartItem.quantity;
    } else {
      // remove
      user.cart = user.cart.filter(
        (item) => item.product.toString() !== productId
      );
      newQuantity = 0;
    }

    user.markModified("cart");
    await user.save();

    const counts = getCartCounts(user);
    return res.json({
      success: true,
      message:
        previousQuantity > 1
          ? "Item quantity decremented by 1"
          : "Item removed from cart",
      updatedQuantity: newQuantity,
      productAmount: product.amount,
      cartCountUnique: counts.uniqueCount,
      cartCountQty: counts.qtyCount,
    });
  } catch (err) {
    console.error("Error removing product:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while removing the product",
    });
  }
});

// Delete Functionality for Orders (AJAX)
router.delete("/orders/remove/:productId", isLoggedIn, async (req, res) => {
  try {
    const productId = req.params.productId;
    console.log("Incoming productId:", productId);

    const user = await usersModel.findOne({ email: req.user.email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const orderItem = user.orders.find(
      (item) => item.product.toString() === productId
    );

    if (!orderItem) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in orders" });
    }

    let finalQuantity;

    // ✅ Decrease quantity or remove item
    if (orderItem.quantity > 1) {
      orderItem.quantity -= 1;
      finalQuantity = orderItem.quantity;
    } else {
      // ❗ Completely remove from orders
      user.orders = user.orders.filter(
        (item) => item.product.toString() !== productId
      );

      // ❗ Also remove from cart when completely removed from orders
      user.cart = user.cart.filter(
        (item) => item.product.toString() !== productId
      );

      finalQuantity = 0; // ✅ Explicitly set to 0
    }

    // ✅ Tell Mongoose the nested arrays changed
    user.markModified("orders");
    user.markModified("cart");

    await user.save();

    return res.json({
      success: true,
      message: "Order updated successfully",
      productId,
      quantity: finalQuantity, // ✅ Always reliable
    });
  } catch (err) {
    console.error("Error in /orders/remove route:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Increment Functionality (AJAX-friendly)
router.post("/cart/inc/:id", isLoggedIn, async (req, res) => {
  try {
    const user = await usersModel.findOne({ email: req.user.email });
    const product = await productsModel.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (product.amount <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Product is out of stock" });

    const cartItem = user.cart.find(
      (item) => item.product.toString() === req.params.id
    );
    if (!cartItem)
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });

    cartItem.quantity += 1;
    product.amount -= 1;

    user.markModified("cart");
    await product.save();
    await user.save();

    const counts = getCartCounts(user);
    return res.json({
      success: true,
      message: "Quantity increased",
      updatedQuantity: cartItem.quantity,
      totalPrice:
        cartItem.quantity * ((product.price || 0) - (product.discount || 0)),
      cartCountUnique: counts.uniqueCount,
      cartCountQty: counts.qtyCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Decrement for cart items

router.post("/cart/dec/:id", isLoggedIn, async (req, res) => {
  try {
    const user = await usersModel.findOne({ email: req.user.email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const productId = req.params.id;
    const product = await productsModel.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const cartIndex = user.cart.findIndex(
      (item) => item.product.toString() === productId
    );
    if (cartIndex === -1)
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });

    const previousQuantity = user.cart[cartIndex].quantity;
    product.amount += 1;

    let updatedQuantity;
    if (previousQuantity <= 1) {
      user.cart.splice(cartIndex, 1);
      updatedQuantity = 0;
    } else {
      user.cart[cartIndex].quantity = previousQuantity - 1;
      updatedQuantity = user.cart[cartIndex].quantity;
    }

    user.markModified("cart");
    await product.save();
    await user.save();

    const totalPrice =
      updatedQuantity > 0
        ? updatedQuantity * (product.price - (product.discount || 0))
        : 0;
    const counts = getCartCounts(user);

    return res.json({
      success: true,
      message:
        updatedQuantity > 0 ? "Quantity decreased" : "Item removed from cart",
      updatedQuantity,
      totalPrice,
      cartCountUnique: counts.uniqueCount,
      cartCountQty: counts.qtyCount,
    });
  } catch (err) {
    console.error("Error in /cart/dec:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Place Your Order
 
router.post("/placeorder", isLoggedIn, async (req, res) => {
  try {
    const { email, contact, address } = req.body;

    const user = await usersModel
      .findOne({ email: req.user.email })
      .populate("orders.product");

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/checkout");
    }

    if (email !== req.user.email) {
      req.flash("error", "The email you entered does not match your account");
      return res.redirect("/checkout");
    }

    if (!contact || !address) {
      req.flash("error", "Phone and Address are required to place the order");
      return res.redirect("/checkout");
    }

    if (user.orders.length === 0) {
      req.flash("error", "You have no active orders to place");
      return res.redirect("/cart");
    }

    // ✅ Move orders to finalized placeOrders
    user.orders.forEach((orderItem) => {
      user.placeOrders.push({
        product: orderItem.product._id,
        quantity: orderItem.quantity,
        orderedAt: new Date(),
      });
    });

    // ✅ Clear both orders and cart ONLY when user confirms the order
    user.orders = [];
    user.cart = [];

    await user.save();

    req.flash("success", "Your order has been placed successfully!");
    return res.redirect("/profile");
  } catch (err) {
    console.error("Error placing your order:", err);
    req.flash("error", "Something went wrong while placing the order");
    return res.redirect("/checkout");
  }
});


module.exports = router;
