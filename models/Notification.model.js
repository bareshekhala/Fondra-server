const { Schema, model } = require("mongoose");

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["poke", "poke_back", "checkin", "checkin_update", "request", "accepted"],
      required: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = model("Notification", notificationSchema);
module.exports = Notification;
