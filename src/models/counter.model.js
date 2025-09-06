import mongoose, { Schema } from "mongoose";

const CounterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    seq: {
        type: Number,
        default: 0,
    },
});

export const Counter = mongoose.model('Counter', CounterSchema);
