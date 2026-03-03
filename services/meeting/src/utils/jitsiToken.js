import jwt from "jsonwebtoken";

export const generateJitsiToken = (user, roomName) => {
  // Handle Render or Docker newlines in .env
  let privateKey = process.env.JITSI_PRIVATE_KEY || "";
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    console.error("JITSI_PRIVATE_KEY missing or improperly formatted.");
  }

  // Render sometimes strips newlines or passes literal "\n" strings. This regex fixes both.
  privateKey = privateKey.replace(/\\n/g, '\n');

  // If it's completely flattened on Render (no \n and no literal spaces), reconstruct it:
  if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
    privateKey = privateKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    // We assume the middle part is base64 and might need folding, but jsonwebtoken
    // is usually permissive if the BEGIN/END headers are strictly on own lines.
  }
  const now = new Date();
  const exp = new Date(now.getTime() + 7200 * 1000); // 2 hours validity
  const nbf = new Date(now.getTime() - 10 * 1000); // Not before 10 secs ago

  // Determine if user should be moderator
  // Adjust this check based on how your user roles are stored
  const isModerator = user.role === "ADMIN" || user.userType === "org_admin";

  const payload = {
    context: {
      user: {
        id: user.id,
        name: `${user.firstName || "User"} ${user.lastName || ""}`,
        email: user.email,
        avatar: user.avatarUrl || "",
        "moderator": isModerator
      },
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

  const token = jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    header: {
      kid: process.env.JITSI_KEY_ID,
      typ: "JWT"
    }
  });

  return token;
};