import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET } from "../constants/env.contants.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]; // or it can be Authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({ message: "Access token required" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = decoded;
    // return true;
    next();
  } catch (err) {
    return res.status(403).send({ message: "Invalid or expired token" });
  }
};
