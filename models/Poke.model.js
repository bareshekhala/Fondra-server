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

    kind: {
      type: String,
      enum: ["poke", "gift"],
      default: "poke",
    },

    species: {
      type: String,
      enum: ["daisy", "tulip", "sunflower", "lavender", "fern"],
      default: null,
    },

    answeredAt: {
      type: Date,
      default: null,
    },

    plantedAt: {
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
