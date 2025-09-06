import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Device } from "../models/device.model.js";
import { generateDeviceID } from "../utils/generateIds.js";



const addDevice = asyncHandler(async (req, res) => {
    const {
        name,
        type,
        modelNumber,
        serialNumber,
        status,
        location,
    } = req.body;

    if (!name || !type) {
        return res.status(400).json(new ApiError(400, "deviceId, name, and type are required"));
    }

    const existingDevice = await Device.findOne({ serialNumber });
    if (existingDevice) {
        return res.status(409).json(new ApiError(409, "Device with this ID already exists"));
    }

    const deviceId = await generateDeviceID();

    const newDevice = await Device.create({
        deviceId,
        name,
        type,
        modelNumber,
        serialNumber,
        status,
        location,
        createdBy: req.user?._id || null, // use auth user ID if available
    });

    return res.status(201).json(new ApiResponse(201, newDevice, "Device added successfully"));
});


const updateDevice = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const device = await Device.findById(id);
    if (!device) {
        return res.status(404).json(new ApiError(404, "Device not found"));
    }
    if (req.user?._id) {
        updates.updatedBy = req.user._id;
    }

    Object.assign(device, updates);
    await device.save();

    const updatedDevice = await Device.findById(id);

    return res.status(200).json(new ApiResponse(200, updatedDevice, "Device updated successfully"));
});

const deleteDevice = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const device = await Device.findById(id);
    if (!device) {
        return res.status(404).json(new ApiError(404, "Device not found"));
    }

    await Device.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Device deleted successfully"));
});

const getDevice = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const device = await Device.findById(id);
    if (!device) {
        return res.status(404).json(new ApiError(404, "Device not found"));
    }

    return res.status(200).json(new ApiResponse(200, device, "Device fetched successfully"));
});

const getAllDevices = asyncHandler(async (req, res) => {
    const devices = await Device.find();

    return res.status(200).json(new ApiResponse(200, devices, "All devices fetched successfully"));
});

export {
    addDevice,
    updateDevice,
    deleteDevice,
    getDevice,
    getAllDevices
};