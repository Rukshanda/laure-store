const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logout,
} = require("../controllers/authController");

// GET Login Page
router.get("/login", (req, res) => {
  res.render("login", {
        layout: res.locals.isAjax ? false : "layouts/layout", // ✅ Explicit layout control

    error: req.flash("error"),
    success: req.flash("success"),
    loginSuccess: req.flash("loginSuccess"),
  });
});

router.post("/login", loginUser);

router.get("/register", (req, res) => {
  res.render("signup", {
    layout: res.locals.isAjax ? false : "layouts/layout",
  });
});

router.post("/register", registerUser);

router.get("/logout", logout);

module.exports = router;
