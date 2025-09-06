import mongoose, { Schema } from "mongoose";


const deviceSchema = new Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true }, // e.g., ABPM Monitor
  type: { type: String, required: true }, // e.g., ABPM, Sleep Study, etc.
  modelNumber: { type: String },
  serialNumber: { type: String },
  status: { type: String, enum: ['available', 'rented', 'maintenance', 'inactive'], default: 'available' },
  location: { type: String }, // if you store location
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  maintenanceLogs: [{
  date: Date,
  action: String, // e.g., "calibration", "repair"
  remarks: String,
  technician: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  }],
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

export const Device = mongoose.model("Device", deviceSchema);