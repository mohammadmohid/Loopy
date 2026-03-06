async function testFlow() {
    console.log("1. Creating Meeting...");
    try {
        const createRes = await fetch("http://localhost:8000/api/meetings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                projectId: "69a8a636e8502f385836a9e8",
                projectName: "Test Project",
                title: "Gateway Test",
                participants: [],
                hostName: "Test Host"
            })
        });
        const createData = await createRes.json();
        console.log("Create OK:", createData.roomName);

        console.log("2. Joining Meeting immediately...");
        const joinRes = await fetch(`http://localhost:8000/api/meetings/join/${createData.roomName}`);
        if (!joinRes.ok) {
            console.error("Join Failed:", joinRes.status, await joinRes.text());
        } else {
            console.log("Join OK:", await joinRes.json());
        }
    } catch (err) {
        console.error("Network/Gateway Error:", err.message);
    }
}

testFlow();
