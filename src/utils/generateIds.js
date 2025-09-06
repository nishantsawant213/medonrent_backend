import { Counter } from "../models/counter.model.js";

const generatePatientID = async () => {
    const prefix = 'P';
    const counter = await Counter.findOneAndUpdate(
        { name: 'patientID' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const patientID = prefix + counter.seq.toString().padStart(7, '0');
    return patientID;
};

const
 generateDeviceID = async () => {
    const prefix = 'D'; // D for Device
    const counter = await Counter.findOneAndUpdate(
        { name: 'deviceID' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const deviceID = prefix + counter.seq.toString().padStart(7, '0');
    return deviceID;
};

const
 generateRentSessionID = async () => {
    const prefix = 'RENT'; // D for Device
    const counter = await Counter.findOneAndUpdate(
        { name: 'RentSessionID' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const RentSessionID = prefix + counter.seq.toString().padStart(7, '0');
    return RentSessionID;
};
export { generatePatientID , generateDeviceID, generateRentSessionID} 
