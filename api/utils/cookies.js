exports.getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,                     // false on localhost
    sameSite: isProd ? "none" : "lax",  // lax on localhost
    path: "/",
    maxAge: 10 * 60 * 1000
  };
};
