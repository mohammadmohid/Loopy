import mongoose from 'mongoose';
import Meeting from './src/models/Meeting.js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const meetings = await Meeting.find().sort({ createdAt: -1 }).limit(3);

    const results = meetings.map(m => `ID: ${m._id}\nRoom: ${m.roomName}\nRecURL: ${m.recordingUrl}\n---`).join('\n');

    fs.writeFileSync('db-out.txt', results);

    console.log("Done");
    mongoose.connection.close();
}
check();
