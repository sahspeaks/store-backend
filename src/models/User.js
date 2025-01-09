import mongoose from "mongoose";
import bcrypt from "bcrypt";

//address schema
const deliveryAddressSchema = new mongoose.Schema({
  doorNo: { type: String },
  street: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  country: { type: String, default: "IN" },
});
const bankDetailsSchema = new mongoose.Schema({
  accountNumber: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
  accountHolderName: { type: String },
  branchName: { type: String },
});
// User schema and model
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, unique: true, required: true },
    address: {
      type: deliveryAddressSchema,
      default: {
        doorNo: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
        country: "IN",
      },
    },
    avatar: {
      type: String,
      default:
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
    },
    bankDetails: bankDetailsSchema,
  },
  {
    timestamps: true,
  }
);
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
//hashing password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const Admin = mongoose.model("Admin", adminSchema);
const User = mongoose.model("User", userSchema);
export { User, Admin };
