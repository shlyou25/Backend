exports.getCookieOptions = () => {
  return {
    httpOnly: true,
    secure: true,        // required for SameSite=None
    sameSite: "none",    // allow cross-site cookies (frontend ↔ API)
    path: "/",
    maxAge: 10 * 60 * 1000 // 10 minutes
  };
};