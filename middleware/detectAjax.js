module.exports = (req, res, next) => {
  res.locals.isAjax =
    req.xhr ||
    req.headers["x-requested-with"] === "XMLHttpRequest" ||
    (req.body && req.body._ajax === "true"); // ✅ Safe check

  next();
};
