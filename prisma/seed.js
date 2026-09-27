import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";

const hashedPassword = await bcrypt.hash("ALLAH@786", 10);

//for superadmin 
await prisma.user.create({
  data: {
    name: "Muhammad Ahmad",
    email: "m.ahmad120133548@gmail.com",
    password: hashedPassword,
    role: "SUPER_ADMIN",
  },
});
