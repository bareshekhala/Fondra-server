const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");

//crypto will be used for making invitation Link
const crypto = require("crypto");
const statusType = ["okay", "busy", "low", "need_checkins"];

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    // this is  an URL and then it will be put on cloudinary
    avatar: { type: String, default: "" },

    inviteCode: {
      type: String,
      unique: true,
      index: true,
    },
    lastCheckIn: {
      type: Date,
      default: null,
    },
    status: { 
        type: String, enum: statusType, default: "okay" 
    },
    statusNote: { 
        type: String, default: "", maxlength: 140 
    },
  },
  {
    timestamps: true,
  },
);

//we want each user to has her own link so she can invite other people
// pre => this run first before anything else and Mongoose validates the user first
userSchema.pre('validate', function () {
  if (!this.inviteCode) {
    this.inviteCode = crypto.randomBytes(6).toString('hex')
  }
})

//changing the user password to a passwordHash
userSchema.methods.setPassword = async function (pass) {
  this.passwordHash = await bcrypt.hash(pass, 12)
}
userSchema.methods.checkPassword = function (pass) {
  return bcrypt.compare(pass, this.passwordHash)
}

//we just send these information to the frontend
userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    name: this.name,
    avatar: this.avatar,
    inviteCode: this.inviteCode,
    lastCheckIn: this.lastCheckIn,
    status: this.status,
    statusNote: this.statusNote,
  }
}
const User = model("User", userSchema);
module.exports = User;
