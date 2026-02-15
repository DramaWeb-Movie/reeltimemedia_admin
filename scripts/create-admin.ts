/**
 * One-time script to create the admin user in Supabase Auth.
 * Run: npm run create-admin
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "admin168@gmail.com";
const ADMIN_PASSWORD = "admin@168";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log("Admin user already exists. You can sign in with:");
      console.log(`  Email: ${ADMIN_EMAIL}`);
      console.log(`  Password: ${ADMIN_PASSWORD}`);
      return;
    }
    console.error("Error creating admin:", error.message);
    process.exit(1);
  }

  console.log("Admin user created successfully!");
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("\nYou can now sign in at /login");
}

main();
