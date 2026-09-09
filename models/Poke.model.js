const { Schema, model } = require("mongoose");
const pokeSchema = new Schema(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    kind: { type: String, enum: ["poke", "wilt"], default: "poke" },
    answeredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
  },
  { timestamps: true },
);
const Poke = model("Poke", pokeSchema);
module.exports = Poke;
