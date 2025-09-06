import { Router } from "express";
import {
  addPatient,
  updatePatient,
  deletePatient,
  getPatient,
  getAllPatients
} from "../controllers/patients.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();
router.route("/all/").get(verifyJWT, getAllPatients);
router.route("").post(verifyJWT, addPatient);
router.route("/:id").get(verifyJWT, getPatient);
router.route("/:id").put(verifyJWT, updatePatient);
router.route("/:id").delete(verifyJWT, deletePatient);


// router.route("/patient").post(verifyJWT, addPatient);
// router.route("/patient:id").get(verifyJWT, getPatient);
// router.route("/updatepatient").put(verifyJWT, updatePatient);
// router.route("/deletepatient:id").delete(verifyJWT, deletePatient);
export default router;
