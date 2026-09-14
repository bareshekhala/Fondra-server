const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");

//crypto is used for making invitation code
const crypto = require("crypto");

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
    checkIn: {
      type: Schema.Types.ObjectId,
      ref: "CheckIn",
      default: null,
    },
    status: {
      type: String,
      enum: ["okay", "busy", "low", "need_checkins"],
      default: "okay",
    },
    statusNote: {
      type: String,
      default: "",
      maxlength: 140,
    },
  },
  {
    timestamps: true,
  },
);

//we want each user to has her own code so she can invite other people
userSchema.pre("validate", function () {
  if (!this.inviteCode) {
    this.inviteCode = crypto.randomBytes(6).toString("hex");
  }
});

userSchema.methods.checkPassword = function (pass) {
  return bcrypt.compare(pass, this.passwordHash);
};

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    name: this.name,
    avatar: this.avatar,
    inviteCode: this.inviteCode,
    lastCheckIn: this.lastCheckIn,
    checkIn: this.checkIn,
    status: this.status,
    statusNote: this.statusNote,
  };
};
const User = model("User", userSchema);
module.exports = User;
