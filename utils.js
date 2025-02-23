export const notificationBodyForChangesInDatabase = {
  title: "New update in the channel",
  body: "Click to see",
};

export const constructNotificationObj = (title, body) => {
  return {
    title: title,
    body: body,
  };
};
