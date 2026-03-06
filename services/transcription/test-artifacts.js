import mongoose from 'mongoose';
import Artifact from './src/models/Artifact.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const artifacts = await Artifact.find().sort({ createdAt: -1 }).limit(3);

    artifacts.forEach(a => {
        console.log(`Artifact: ${a._id} | Meeting: ${a.meetingId} | Status: ${a.transcriptionStatus}`);
        if (a.error) console.log(`   Error: ${a.error}`);
    });

    console.log("Done");
    mongoose.connection.close();
}
check();
