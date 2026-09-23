import dotenv from "dotenv";
import "@testing-library/jest-dom";

dotenv.config({ path: ".env.test" });

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres@localhost:5433/loyalty_test";
process.env.DIRECT_URL = process.env.DIRECT_URL || "postgresql://postgres@localhost:5433/loyalty_test";
