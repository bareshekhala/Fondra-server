const { Schema, model } = require("mongoose");
const checkInSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    
    localDate: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

checkInSchema.index({ user: 1, localDate: 1, slot: 1 });

const CheckIn = model("CheckIn", checkInSchema);
module.exports = CheckIn;
