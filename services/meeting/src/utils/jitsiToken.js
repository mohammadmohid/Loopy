import jwt from "jsonwebtoken";

export const generateJitsiToken = (user, roomName) => {
  const privateKey = process.env.JITSI_PRIVATE_KEY.replace(/\\n/g, '\n'); // Handle newlines in .env

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