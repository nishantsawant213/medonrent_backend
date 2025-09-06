import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Patient } from "../models/patient.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generatePatientID } from "../utils/generateIds.js";
import bcrypt from "bcrypt";

const addPatient = asyncHandler(async (req, res) => {
    const {
        patientName,
        mobileNo,
        email,
        dateOfBirth,
        height,
        weight,
        sleeptime,
        wakeUpTime,
        address,
        notes,
    } = req.body;


    console.log(req.body);
    if (
        [
            patientName,
            mobileNo,
            height,
            weight,
            address
        ].some((field) => typeof field === "string" && field.trim() === "")
    ) {
        return res.status(400).json(new ApiError(400, "All fields are required"));
    }

    const existedUser = await Patient.findOne({
        $or: [{ mobileNo }],
    });

    console.log(existedUser);

    if (existedUser) {
        return res.status(409).json(new ApiError(409, "Petient Already Exists"));
    }

    const password = "Petient@2025";

    const patientID = await generatePatientID();
    console.log(patientID);
    const patient = await Patient.create({
        patientID,
        patientName,
        mobileNo,
        email,
        dateOfBirth,
        height,
        weight,
        sleeptime,
        wakeUpTime,
        notes,
        address,
        password,
        createdBy : req.user?._id || null,
    });

    const createdPatient = await Patient.findById(patient._id)
        .select("-password -refreshToken")

    if (!createdPatient) {
        return res.status(500).json(new ApiError(500, "Something Went Wrong while adding the Patient"));
    }
    return res
        .status(201)
        .json(new ApiResponse(200, createdPatient, "Patient added successfully"));
});

const updatePatient = asyncHandler(async (req, res) => {
    const updates = req.body;
    const { id } = req.params;

    console.log(id)

    const patient = await Patient.findById(id);
    if (!patient) {
        return res.status(404).json(new ApiError(404, "Patient not found"));
    }

    const restrictedFields = ['patientID', 'password'];
    for (const field of restrictedFields) {
        if (field in updates) {
            delete updates[field]; // Remove them if present in req.body
        }
    }

    if (req.user?._id) {
        updates.updatedBy = req.user._id;
    }

    Object.keys(updates).forEach((key) => {
        patient[key] = updates[key];
    });

    await patient.save();

    const updatedPatient = await Patient.findById(id).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPatient, "Patient updated successfully"));
});

const deletePatient = asyncHandler(async (req, res) => {
    const { id } = req.params;

    console.log(id)

    const patient = await Patient.findById(id);
    if (!patient) {
        return res.status(404).json(new ApiError(404, "Patient not found"));
    }

    await Patient.findByIdAndDelete(id);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Patient deleted successfully"));
});

const getPatient = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const patient = await Patient.findById(id).select("-password -refreshToken");
    if (!patient) {
        return res.status(404).json(new ApiError(404, "Patient not found"));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, patient, "Patient fetched successfully"));
});

const getAllPatients = asyncHandler(async (req, res) => {
    const patients = await Patient.find().select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, patients, "All patients fetched successfully"));
});


export {
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    getAllPatients
};

