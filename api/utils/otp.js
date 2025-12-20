const crypto = require("crypto");

exports.generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

exports.hashOtp = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
