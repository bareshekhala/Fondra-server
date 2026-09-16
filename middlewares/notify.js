const Notification = require("../models/Notification.model.js");
const Connection = require("../models/Connection.model.js");

const notify = (user, { actor, type }) => {
  return Notification.create({ user, actor, type });
};

const notifyCircle = async (actor, { type }) => {
  const connections = await Connection.find({
    status: "accepted",
    $or: [{ requester: actor }, { recipient: actor }],
  }).select("requester recipient");

  const toCreate = connections.map((connection) => ({
    user: String(connection.requester) === String(actor) ? connection.recipient : connection.requester,
    actor,
    type,
  }));

  return Notification.create(toCreate);
};

module.exports = { notify, notifyCircle };
