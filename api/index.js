const app = require("../artifacts/api-server/dist/app.cjs");
module.exports = app.default ?? app;
