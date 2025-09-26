const express = require("express");
const router = express.Router();
const adminModel = require("../models/adminModel");
const cloudinary = require("cloudinary").v2;
const jwt = require("jsonwebtoken");
const isAdmin = require("../middleware/isAdmin");
const upload = require("../config/multerconfig");
const productsModel = require("../models/productsModel");

// Render login page
router.get("/create", (req, res) => {
  // Detect if AJAX request
   const isAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest";


  res.render("adminlogin", {
    success: req.flash("success"),
    error: req.flash("error"),
    layout: isAjax ? false : "layouts/layout"
  });
});

// Admin login -> generate JWT
router.post("/create", async (req, res) => {
  try {
    const { email, psw } = req.body;

    const admin = await adminModel.findOne({ email });
    if (!admin || admin.psw !== psw) {
      req.flash("error", "Email or Password incorrect");
      return res.redirect("/admin/create");
    }

    // Create JWT token
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, { httpOnly: true, secure: false });
    req.flash("success", "Welcome back, Admin!");

    console.log("✅ Admin logged in, token issued");

    return res.render("addproduct", {
      success: req.flash("success"),
      token,
      layout: isAjax ? false : "layouts/layout"
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Server error");
    return res.redirect("/admin/create");
  }
});

// Add Product Page
router.get("/addproduct", isAdmin, (req, res) => {
  // Detect if AJAX request
   const isAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest";


  res.render("addproduct", {
    layout: isAjax ? false : "layouts/layout"
  });
});

// View All Products
router.get("/allproducts", isAdmin, async (req, res) => {
  // Detect if AJAX request
   const isAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest";


  try {
    const products = await productsModel.find();
    res.render("allproducts", {
      products,
      success: req.flash("success"),
      error: req.flash("error"),
      layout: isAjax ? false : "layouts/layout"
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Failed to load products");
    res.render("allproducts", {
      products: [],
      layout: isAjax ? false : "layouts/layout"
    });
  }
});

// View All Users
router.get("/allusers", isAdmin, (req, res) => {
  // Detect if AJAX request
   const isAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest";


  res.render("allusers", {
    layout: isAjax ? false : "layouts/layout"
  });
});

// Create product (only admin)
router.post("/addproduct", isAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, price, discount, amount, category, badge } = req.body;

    if (!req.file) {
      req.flash("error", "Please upload an image");
      return res.redirect("/admin/addproduct");
    }

    // Upload image to Cloudinary
    const cloudinaryUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const uploadResult = await cloudinaryUpload();

    // Save product to DB
    await productsModel.create({
      image: uploadResult.secure_url,
      name,
      price,
      discount,
      amount,
      category,
      badge
    });

    console.log("✅ Product Created Successfully");
    req.flash("success", "Product Created Successfully");
    return res.redirect("/admin/allproducts");
  } catch (err) {
    console.error("Server Error:", err);
    req.flash("error", "Server error");
    res.redirect("/admin/addproduct");
  }
});

module.exports = router;
