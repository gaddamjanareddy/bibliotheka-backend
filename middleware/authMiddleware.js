import jwt from "jsonwebtoken";

// To Verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  console.log("authHeader:", authHeader);
  const token = authHeader && authHeader.split(" ")[1];
  console.log("token:", token);

  console.log("Authorization header:", authHeader);
  console.log("Extracted token:", token);

  if (!token) return res.status(401).json({ error: "Access denied. No token." });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = {
    id: decoded.id, 
    _id: decoded.id,      
    role: decoded.role,
  };

    next();
  });
};

// Role-based access
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Access denied: insufficient permissions" });
    }
    next();
  };
};

export { authenticateToken, authorizeRoles };
