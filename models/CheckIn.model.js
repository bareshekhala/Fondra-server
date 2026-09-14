const { Schema, model } = require("mongoose");

const checkInSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mood: {
      type: String,
      enum: ["good", "okay", "low"],
      default: "okay",
    },
    note: {
      type: String,
      default: "",
      maxlength: 140,
    },
    social: {
      type: String,
      enum: [
        "",
        "Need space",
        "Social battery is low",
        "Just open to be poked",
        "Chat only",
        "Chat & call",
        "Let's hang out",
        "Let's party",
      ],
      default: "",
    },

    localDate: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

checkInSchema.index({ user: 1, localDate: 1 });

const CheckIn = model("CheckIn", checkInSchema);
module.exports = CheckIn;
