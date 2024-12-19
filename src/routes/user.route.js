import Router from "express";

import {
  loginUser,
  signupUser,
  fetchUser,
  refreshToken,
  updateUser,
} from "../controllers/auth/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

//login customer
router.route("/login").post(loginUser);
//signup customer
router.route("/signup").post(signupUser);
//refresh token
router.route("/refresh-token").post(refreshToken);
//fetch customer
router.route("/user/:id").get(verifyToken, fetchUser);
//update customer
router.route("/user/update/:id").put(verifyToken, updateUser);

export default router;
