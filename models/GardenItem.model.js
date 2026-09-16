const { Schema, model } = require("mongoose");

const gardenItemSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    poke: {
      type: Schema.Types.ObjectId,
      ref: "Poke",
      required: true,
      unique: true,
    },
    
    species: {
      type: String,
      enum: ["daisy", "tulip", "sunflower", "lavender", "fern"],
      required: true,
    },
    picked: {
      type: Boolean,
      default: false,
    },
    x: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    y: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  { timestamps: true },
);

gardenItemSchema.index({ user: 1, createdAt: 1 });

const GardenItem = model("GardenItem", gardenItemSchema);
module.exports = GardenItem;