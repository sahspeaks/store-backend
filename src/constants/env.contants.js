import dotenv from "dotenv";
dotenv.config({
  path: ".env",
});

const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export { PORT, DATABASE_URL, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET };
