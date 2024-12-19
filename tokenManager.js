import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class QikinkTokenManager {
  constructor() {
    this.tokenFilePath = path.join(__dirname, "qikink-token.json");
    this.token = null;
    this.tokenExpiry = null;
    this.clientId = process.env.QIKINK_CLIENT_ID;
    this.clientSecret = process.env.QIKINK_CLIENT_SECRET;
  }

  async initialize() {
    try {
      // Try to load existing token from file
      const tokenData = await this.loadTokenFromFile();
      if (tokenData) {
        this.token = tokenData.token;
        this.tokenExpiry = new Date(tokenData.expiry);

        // If token is expired, refresh it immediately
        if (this.isTokenExpired()) {
          await this.refreshToken();
        }
      } else {
        // No token exists, get a new one
        await this.refreshToken();
      }
    } catch (error) {
      console.error("Error initializing Qikink token manager:", error);
      throw error;
    }
  }

  isTokenExpired() {
    if (!this.token || !this.tokenExpiry) return true;
    return new Date() >= this.tokenExpiry;
  }

  async getToken() {
    try {
      // If token is expired or missing, refresh it
      if (this.isTokenExpired()) {
        await this.refreshToken();
      }
      return this.token;
    } catch (error) {
      console.error("Error getting Qikink token:", error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      console.log("Refreshing Qikink access token...");

      const response = await axios.post(
        "https://api.qikink.com/api/token",
        new URLSearchParams({
          ClientId: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.data && response.data.Accesstoken) {
        this.token = response.data.Accesstoken;

        // Set expiry based on the expires_in value (converting seconds to milliseconds)
        const expiresIn = response.data.expires_in * 1000;
        this.tokenExpiry = new Date(Date.now() + expiresIn);

        // Save token to file
        await this.saveTokenToFile();

        console.log("Qikink access token refreshed successfully");
        return this.token;
      } else {
        throw new Error("Access token missing in Qikink response");
      }
    } catch (error) {
      console.error("Error refreshing Qikink access token:", error);
      throw error;
    }
  }

  async saveTokenToFile() {
    try {
      const tokenData = {
        token: this.token,
        expiry: this.tokenExpiry.toISOString(),
      };
      await fs.writeFile(
        this.tokenFilePath,
        JSON.stringify(tokenData, null, 2)
      );
    } catch (error) {
      console.error("Error saving Qikink token to file:", error);
      throw error;
    }
  }

  async loadTokenFromFile() {
    try {
      const data = await fs.readFile(this.tokenFilePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid
      return null;
    }
  }
}

// Export a default instance of the token manager
export default new QikinkTokenManager();
