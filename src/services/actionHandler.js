export async function handlePendingAction() {

  const stored = localStorage.getItem("pendingAction");

  if (!stored) return;

  try {

    const event = JSON.parse(stored);

    const action = event.actionId;
    const data = event.notification?.data || {};

    console.log("Processing action:", action, data);

    if (action === "COMPLETE") {

      await fetch("https://your-api.com/habit-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          habitId: data.habitId
        })
      });

    }

    if (action === "DO_NOW") {
      console.log("User clicked Do now");
    }

  } catch (err) {
    console.error("Error handling notification action:", err);
  }

  // clear after processing
  localStorage.removeItem("pendingAction");
}