import axios from 'axios';

async function test() {
    console.log("Testing POST to http://localhost:4002/transcribe");
    try {
        const res = await axios.post("http://localhost:4002/transcribe", {
            meetingId: "69a992861b677deb5fc6a830",
            projectId: "69a8a636e8502f385836a9e8",
            recordingUrl: "https://pub-02b3b45364074db9ad271a2018e20b16.r2.dev/Chat_Project/mkljklj_2026-03-05_3618.mp4",
            filename: "test_from_script"
        }, { timeout: 2000 });
        console.log("SUCCESS:", res.status, res.data);
    } catch (err) {
        console.error("ERROR CODE:", err.code);
        console.error("ERROR MESSAGE:", err.message);
        if (err.response) {
            console.error("RESPONSE DATA:", err.response.data);
        }
    }
}
test();
