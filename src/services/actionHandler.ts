export async function handlePendingAction() {

  const stored = localStorage.getItem("pendingAction");

  if (!stored) return;

  const event = JSON.parse(stored);

  const action = event.actionId;
  const data = event.notification.data;

  if (action === "COMPLETE") {

    await fetch("https://your-api.com/habit-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habitId: data.habitId
      })
    });

  }

  if (action === "DO_NOW") {
    console.log("User clicked do now");
  }

  localStorage.removeItem("pendingAction");
}