import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} from "../../constants/env.contants.js";
import { User } from "../../models/User.js";
import { rateLimit } from "express-rate-limit";

// Rate limiting for login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: { message: "Too many login attempts, please try again later" },
});

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );
  const refreshToken = jwt.sign(
    { userId: user._id, role: user.role },
    REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
};

const validatePassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    throw new Error("Password must be at least 8 characters long");
  }
  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new Error(
      "Password must contain uppercase, lowercase, numbers and special characters"
    );
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    if (!email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const { accessToken, refreshToken } = generateTokens(user);
    // Remove password field before sending response
    const userWithoutPassword = user.toObject(); // Converts Mongoose document to plain object
    delete userWithoutPassword.password;

    return res.status(200).json({
      message: "Login successful 2",
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const signupUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    try {
      validatePassword(password);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
    // Check for existing email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    // Check for existing phone
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res
        .status(400)
        .json({ message: "Phone number already registered" });
    }
    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
    });
    await newUser.save();
    const { accessToken, refreshToken } = generateTokens(newUser);
    // Remove password field before sending response
    const userWithoutPassword = newUser.toObject(); // Converts Mongoose document to plain object
    delete userWithoutPassword.password;

    return res.status(200).json({
      message: "Login successful 2",
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const fetchUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Ensure the authenticated user can only access their own data
    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "User fetched Successfully", user });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//new update user cotroller
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure the authenticated user can only update their own data
    if (req.user.userId !== id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      avatar: req.body.avatar,
      address: {
        country: req.body.country,
        state: req.body.state,
        city: req.body.city,
        street: req.body.street,
        pincode: req.body.pincode,
        doorNo: req.body.doorNo,
      },
    };

    // Remove undefined values
    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    if (updates.address) {
      Object.keys(updates.address).forEach((key) => {
        if (updates.address[key] === undefined) {
          delete updates.address[key];
        }
      });

      // Remove address object if empty
      if (Object.keys(updates.address).length === 0) {
        delete updates.address;
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
        select: "-password -tokenVersion",
      }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

// export const updateUser = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       firstName,
//       lastName,
//       avatar,
//       country,
//       state,
//       city,
//       street,
//       pincode,
//       doorNo,
//     } = req.body;
//     // Ensure the authenticated user can only update their own data
//     if (req.user.userId !== id && req.user.role !== "admin") {
//       return res.status(403).json({ message: "Access denied" });
//     }
//     const user = await User.findById(id);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Initialize address object if it doesn't exist
//     if (!user.address) {
//       user.address = {};
//     }

//     // Update user fields
//     user.firstName = firstName || user.firstName;
//     user.lastName = lastName || user.lastName;
//     user.avatar = avatar || user.avatar;
//     user.address.country = country || user.address.country;
//     user.address.state = state || user.address.state;
//     user.address.city = city || user.address.city;
//     user.address.street = street || user.address.street;
//     user.address.pincode = pincode || user.address.pincode;
//     user.address.doorNo = doorNo || user.address.doorNo;

//     try {
//       const updatedUser = await user.save();
//       return res.status(200).json({
//         message: "User updated successfully",
//         user: updatedUser,
//       });
//     } catch (saveError) {
//       console.log("Save error:", saveError);
//       return res.status(400).json({
//         message: "Failed to save user",
//         error: saveError.message,
//       });
//     }
//   } catch (err) {
//     console.log("General error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
