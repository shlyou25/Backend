exports.getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 10 * 60 * 1000,
    domain: isProd ? ".domz.com" : "localhost"
  };
};