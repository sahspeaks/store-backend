import mongoose from "mongoose";
import { Database, Resource } from "@adminjs/mongoose";
import AdminJS from "adminjs";
AdminJS.registerAdapter({ Database, Resource });
const initialize = async () => {
  // console.log("Connecting to database...", process.env.DATABASE_URL);
  const db = await mongoose.connect(process.env.DATABASE_URL);
  return { db };
};
export default initialize;
