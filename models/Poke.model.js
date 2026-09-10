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
    answeredAt: {
      type: Date,
      default: null,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    localDate: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);
const Poke = model("Poke", pokeSchema);
module.exports = Poke;
