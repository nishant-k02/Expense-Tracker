import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: pnpm tsx scripts/hash-password.ts <password>");
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
});
