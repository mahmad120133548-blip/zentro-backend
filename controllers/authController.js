import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/emailService.js";

export const login=async(req,res)=>{

    try{
        const{email,password}=req.body;

        if(!email || !password)
        {
            return res.status(400).json({
                message:"Email and Password are Required"
            });
        }

    const user=await prisma.user.findUnique({
        where:{
            email,
        },
    });

    if(!user)
    {
        return res.status(401).json({
            message:"Invalid email or password"
        });
    }

    const isPasswordCorrect=await bcrypt.compare(
        password,
        user.password
    );

    if(!isPasswordCorrect)
    {
        return res.status(401).json({
            message:"Invalid email or Password"
        });
    }

    if(user.role==="SUPER_ADMIN")
    {
        const token=jwt.sign(
            {
                id:user.id,
                role:user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn:"30d",
            }
        );
      
  res.cookie("token", token, {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
 maxAge: 30 * 24 * 60 * 60 * 1000
});

return res.status(200).json({
  message: "Login successful",
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  },
});
}
if (user.role === "VENDOR") {
  const vendor = await prisma.vendor.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (!vendor) {
    return res.status(404).json({
      message: "Vendor profile not found",
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      vendorId: vendor.id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  return res.status(200).json({
    message: "Login successful",
   user: {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  vendor: {
    id: vendor.id,
    businessName: vendor.businessName,
    approvalStatus: vendor.approvalStatus,
    storeStatus: vendor.storeStatus,
  },
},
  });
}

if (user.role === "CUSTOMER") {
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "90d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 90 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

return res.status(403).json({
  message: "Access Denied",
});

} catch (error) {
  return res.status(500).json({
    message: "Something went wrong",
  });
}
};
    


export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,

        vendor: {
          select: {
            id: true,
            businessName: true,
            approvalStatus: true,
            storeStatus: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user,
    });
  } 
  catch(error)
   {
    
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  res.status(200).json({
    message: "Logout successful",
  });
};

// this is  vendor registration 
export const vendorRegister=async(req,res)=>{
    try{
        const{name,businessName,email,phone,categoryId,password,confirmPassword}=req.body;

        if(!name || !businessName || !email || !phone || !categoryId || !password || !confirmPassword)
        {
            return res.status(400).json({
                message:"All fields are required"
            });
        }

        if(password !==confirmPassword)
        {
            return res.status(400).json({
                message:"Password do not match "
            });
        }

        const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser)
    {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const category = await prisma.category.findUnique({
      where: {
        id: Number(categoryId),
      },
    });

    if (!category)
    {
      return res.status(400).json({
        message: "Invalid business category",
      });
    }

     const hashedPassword = await bcrypt.hash(password, 10);

     const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "VENDOR",
        status: "ACTIVE",
      },
    });

    await prisma.vendor.create({
      data: {
        userId: user.id,
        businessName,
        phone,
        categoryId: Number(categoryId),
        approvalStatus: "PENDING",
        storeStatus: "INACTIVE",
      },
    });

    const superAdmin = await prisma.user.findFirst({
      where: {
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });

    if (superAdmin)
    {
      await prisma.notification.create({
        data: {
          userId: superAdmin.id,
          title: "New Vendor Registration",
          message: `${businessName} has submitted a new vendor registration and is awaiting approval.`,
          type: "VENDOR_REGISTRATION",
        },
      });

      await sendEmail({
        to: superAdmin.email,
        subject: "New Vendor Registration - Zentro",
        html: `
          <h2>New Vendor Registration</h2>

          <p>A new vendor has submitted a registration request on Zentro.</p>

          <p><strong>Vendor Name:</strong> ${name}</p>
          <p><strong>Business Name:</strong> ${businessName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Category:</strong> ${category.name}</p>
          <p><strong>Status:</strong> Pending Approval</p>

          <p>Please log in to the Super Admin dashboard to review this vendor.</p>
        `,
      });
    }

    return res.status(201).json({
      message: "Vendor registration submitted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export const customerRegister = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });

  await sendEmail({
  to: user.email,
  subject: "Welcome to Zentro - Registration Successful",
  html: `
    <div style="margin:0; padding:30px 15px; background:#F4F7FA; font-family:Arial, Helvetica, sans-serif;">

      <div style="max-width:560px; margin:0 auto; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden;">

        <div style="padding:22px 25px; background:#0B1F33;">
          <h1 style="margin:0; color:#FFFFFF; font-size:24px; font-weight:700;">
            Zentro
          </h1>
        </div>

        <div style="padding:30px 28px;">

          <h2 style="margin:0 0 18px; color:#0B1F33; font-size:22px;">
            Welcome to Zentro!
          </h2>

          <p style="margin:0 0 12px; color:#334155; font-size:15px; line-height:1.6;">
            Hi <strong>${user.name}</strong>,
          </p>

          <p style="margin:0 0 18px; color:#64748B; font-size:14px; line-height:1.7;">
            Your customer account has been successfully created.
            You can now log in and start exploring products  on Zentro.
          </p>

          <div style="margin:22px 0; padding:14px 16px; background:#FFF7ED; border-left:3px solid #F97316; border-radius:6px;">
            <p style="margin:0; color:#475569; font-size:13px; line-height:1.6;">
              Your account is ready. Happy shopping!
            </p>
          </div>

          <p style="margin:24px 0 0; color:#64748B; font-size:14px; line-height:1.6;">
            Thank you for joining Zentro.
          </p>

          <p style="margin:18px 0 0; color:#0B1F33; font-size:14px; font-weight:600;">
            Regards,<br />
            Zentro Team
          </p>

        </div>

        <div style="padding:16px 25px; background:#F8FAFC; border-top:1px solid #E2E8F0; text-align:center;">
          <p style="margin:0; color:#94A3B8; font-size:11px;">
            © ${new Date().getFullYear()} Zentro. All rights reserved.
          </p>
        </div>

      </div>

    </div>
  `,
});


    return res.status(201).json({
      message: "Customer registration successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};