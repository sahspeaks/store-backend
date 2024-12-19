import { DefaultAuthProvider } from "adminjs";
import componentLoader from "./component-loader.js";
import { Admin } from "../models/User.js";
const provider = new DefaultAuthProvider({
  componentLoader,
  authenticate: async ({ email, password }) => {
    try {
      if (!email || !password) {
        return false;
      }

      const user = await Admin.findOne({ email });
      if (!user) {
        console.log("User not found");
        return false;
      }

      if (user.password === password) {
        console.log("User authenticated:", user.email);
        return {
          email: user.email,
          id: user._id.toString(),
          title: user.email.split("@")[0],
        };
      }

      return false;
    } catch (error) {
      console.error("Authentication error:", error);
      return false;
    }
  },
});
export default provider;
