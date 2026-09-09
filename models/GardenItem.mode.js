const { Schema, model } = require("mongoose");

const speciesType = ["daisy", "tulip", "sunflower", "lavender", "fern"];

const gardenItemSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    species:{
      type: String,
      enum: speciesType,
      required: true,
    },
    // normalised position inside the plot, 0 to 1, so the scene can reflow
    // with the screen size instead of breaking at a fixed pixel width
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