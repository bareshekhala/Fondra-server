const { Schema, model } = require("mongoose");

const connectionSchema = new Schema({
  requester:{ 
    type: Schema.Types.ObjectId, ref: "User", 
    required: true,
},
  recipient:{ 
    type: Schema.Types.ObjectId, ref: "User",
    required: true,

 },
  status: {
    type: String,
    enum: ["pending", "accepted"],
    default: "pending",
  },
},{timestamps: true});

connectionSchema.index({ requester: 1, recipient: 1 },{unique: true})

const Connection = model("Connection", connectionSchema);
module.exports = Connection;
