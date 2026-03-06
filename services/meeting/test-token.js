import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const testUser = {
    id: "69a74b25129aed84201bfc7d",
    firstName: "Test",
    lastName: "User",
    email: "test@loopy.com",
    role: "ADMIN"
};

const roomName = "Loopy-69a74b25129aed84201bfc7d-69ab29171ddb7ad91b27c646";

// Handle Render or Docker newlines in .env
let privateKey = process.env.JITSI_PRIVATE_KEY || "";
if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    console.error("JITSI_PRIVATE_KEY missing or improperly formatted.");
}

privateKey = privateKey.replace(/\\n/g, '\n');

if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
    privateKey = privateKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
}
const now = new Date();
const exp = new Date(now.getTime() + 7200 * 1000); // 2 hours validity
const nbf = new Date(now.getTime() - 10 * 1000); // Not before 10 secs ago

const payload = {
    context: {
        user: testUser,
        features: {
            recording: true,
            livestreaming: true,
            "screen-sharing": true
        }
    },
    aud: "jitsi",
    iss: "chat",
    sub: process.env.JITSI_APP_ID,
    room: roomName || "*",
    exp: Math.round(exp.getTime() / 1000),
    nbf: Math.round(nbf.getTime() / 1000)
};

console.time("Generate Token");
try {
    const token = jwt.sign(payload, privateKey, {
        algorithm: "RS256",
        header: {
            kid: process.env.JITSI_KEY_ID,
            typ: "JWT"
        }
    });
    console.log("Token generation success:", token.substring(0, 20) + "...");
} catch (e) {
    console.error("Token generation failed:", e.message);
}
console.timeEnd("Generate Token");
