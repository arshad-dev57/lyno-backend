// middlewares/auth.js
const jwt = require("jsonwebtoken");

/**
 * JWT Auth middleware (Express)
 * - Accepts token from:
 *    1) Authorization: Bearer <token>
 *    2) x-access-token header
 *    3) req.cookies.token (if cookie-parser use ho raha)
 * - Supports payload user id keys: id | _id | userId | sub
 * - Sets req.user = { id: <string> }
 */
module.exports = function auth(req, res, next) {
  try {
    // 1) Extract token from headers/cookies
    let token;
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.headers["x-access-token"]) {
      token = req.headers["x-access-token"];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token; // needs cookie-parser
    }

    if (!token) {
      return res.status(401).json({ message: "No token provided." });
    }

    // 2) Ensure secret available
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // App misconfig — don't leak details in prod logs if not needed
      return res.status(500).json({ message: "Server misconfig: JWT_SECRET missing." });
    }

    // 3) Verify token
    let decoded;
    try {
      // Optionally pin algorithms
      // decoded = jwt.verify(token, secret, { algorithms: ["HS256"], clockTolerance: 5 });
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired." });
      }
      return res.status(401).json({ message: "Invalid token." });
    }

    // 4) Normalize user id from payload (id | _id | userId | sub)
    const uid = decoded.id || decoded._id || decoded.userId || decoded.sub;
    if (!uid) {
      return res.status(401).json({ message: "Invalid token payload." });
    }

    // 5) Attach to req
    req.user = { id: String(uid) };

    // 6) Continue
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Unable to verify token." });
  }
};
