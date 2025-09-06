import { Router } from "express";
import {
  loginUser,
  logoutUser,
  currentUser,
  registerUser
} from "../controllers/user.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/getuser").get(verifyJWT, currentUser);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
