import prisma from "../config/prisma.js";
import { sendEmail } from "../services/emailService.js";
import bcrypt from "bcrypt";

export const getDashboardStats = async (req, res) => {
  try {
    const totalVendors = await prisma.vendor.count();

    const pendingApprovals = await prisma.vendor.count({
      where: {
        approvalStatus: "PENDING",
      },
    });

    const approvedVendors = await prisma.vendor.count({
      where: {
        approvalStatus: "APPROVED",
      },
    });

     const rejectedVendors = await prisma.vendor.count({
      where: {
        approvalStatus: "REJECTED",
      },
    });

    const activeStores = await prisma.vendor.count({
      where: {
        storeStatus: "ACTIVE",
      },
    });

    return res.status(200).json({
      totalVendors,
      pendingApprovals,
      approvedVendors,
      rejectedVendors,
      activeStores,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};


export const getVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        user: true,
      },
    });

    return res.status(200).json(vendors);
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// this is  for vendor overview portion 
export const getRecentVendors=async(req,res)=>{
  try{
    const vendors=await prisma.vendor.findMany({
      orderBy:{
        createdAt:"desc",
      },
      take:5,
      include:{
        user:true,
      },
    });

    return res.status(200).json(
      vendors.map((vendor)=>({
        id:vendor.id,
        name:vendor.user.name,
        email:vendor.user.email,
        store:vendor.businessName,
        registered:vendor.createdAt,
        approvalStatus:vendor.approvalStatus,
        storeStatus:vendor.storeStatus,
      }))
    );  
  }
  catch(error){
    return res.status(500).json({
      message:"something went wrong"
    });
  }
};


export const getPendingApprovals = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        approvalStatus: "PENDING",
      },
      include: {
        user: true,
      },
    });

    return res.status(200).json(
      vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.user.name,
        email: vendor.user.email,
        store: vendor.businessName,
        registered: vendor.createdAt,
        approval: vendor.approvalStatus,
      }))
    );
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

// admin notification work
export const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      notifications,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};



export const markNotificationAsRead = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);

    const notification = await prisma.notification.findUnique({
      where: {
        id: notificationId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    // mark as read logic
    const updatedNotification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });

    return res.status(200).json({
      message: "Notification marked as read",
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      message: "Failed to mark notification as read",
    });
  }
};

export const approveVendors=async(req,res)=>{
  try{
    const vendorId=Number(req.params.id);

    const vendor=await prisma.vendor.findUnique({
      where:{
        id:vendorId,
      },
      include:{
        user:true,
      },
    });

    if(!vendor)
    {
      return res.status(404).json({
        message:"vendor not found"
      });
    }
    if(vendor.approvalStatus !=="PENDING")
    {
      return res.status(400).json({
        message:"Vendor is not Pending Approval"
      });
    }

    const updatedVendor=await prisma.vendor.update({
      where:{
        id:vendorId,
      },
      data:{
        approvalStatus:"APPROVED",
        storeStatus:"ACTIVE",
      },
    });

    await prisma.notification.create({
      data:{
        userId:vendor.userId,
        title:"Vendor Account Approved",
        message:"Your vendor account has been approved. You can now access your vendor dashboard.",
        type:"VENDOR_APPROVED",
      },
    });

    await sendEmail({
      to:vendor.user.email,
      subject:"Vendor Account Approved-Zentro",
      html:`
       <h2>Vendor Account Approved</h2>

        <p>Congratulations! Your vendor registration on Zentro has been approved.</p>

        <p><strong>Vendor Name:</strong> ${vendor.user.name}</p>
        <p><strong>Business Name:</strong> ${vendor.businessName}</p>
        <p><strong>Status:</strong> Approved</p>

        <p>Your store is now active and you can access your vendor dashboard.</p>

        <p>Please log in to your Zentro vendor account to continue.</p> `,
    });

    return res.status(200).json({
      message:"vendor approved successfully",
      vendor:updatedVendor,
    }); 
  }

  catch(error)
  {
    return res.status(500).json({
      message:"something went wrong",
    });
  }

};

export const rejectVendor=async(req,res)=>{
  try{
    const vendorId=Number(req.params.id);

    const vendor=await prisma.vendor.findUnique({
      where:{
        id:vendorId
      },
      include:{
        user:true,
      },
    });

    if(!vendor)
    {
      return res.status(404).json({
        message:"Vendor not found"
      });
    }

    if(vendor.approvalStatus!=="PENDING")
    {
      return res.status(400).json({
        message:"Vendor is not Pending Approval"
      });
    }
    const updatedVendor=await prisma.vendor.update({
      where:{
        id:vendorId,
      },
      data:{
        approvalStatus:"REJECTED",
        storeStatus:"INACTIVE",
      },
    });
    await sendEmail({
      to:vendor.user.email,
      title:"Vendor Registration Rejected - bZentro",
      html:`
           <h2>Vendor Registration Rejected</h2>

        <p>We regret to inform you that your vendor registration on Zentro has been rejected.</p>

        <p><strong>Vendor Name:</strong> ${vendor.user.name}</p>
        <p><strong>Business Name:</strong> ${vendor.businessName}</p>
        <p><strong>Status:</strong> Rejected</p>

        <p>
          If you believe this was a mistake or need further information,
          please contact Zentro support.
        </p>,`
    });

    return res.status(200).json({
      message:"Vendor Rejected Successfully"
    });
  }
  catch(error)
  {
    return res.status(500).json({
      message:"Something went wrong"
    });
  };
}

// setting work 

export const getAdminProfile = async (req,res)=>{

  try{
    const admin=await prisma.user.findUnique({
      where:{
        id:req.user.id
      },
      select:{
         id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if(!admin)
    {
      return res.status(404).json({
        message:"Admin Profile not Found"
      });
    }
    return res.status(200).json({
      admin
    });
  }

   catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
   }
}

export const updateAdminProfile=async(req,res)=>{
  try{
    const{name,email}=req.body;

    if(!name || !email)
    {
      return res.status(400).json({
        message:"Name and email are Required"
      });
    }

     const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(409).json({
        message: "Email is already in use",
      });
    }

    const updatedAdmin = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        name,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

//change admin password

export const changeAdminPassword=async(req,res)=>{
  try{
    const{currentPassword,newPassword,confirmPassword}=req.body;

    if(!currentPassword || !newPassword || !confirmPassword)
    {
      return res.status(400).json({
        message:"All fields are Required"
      });
    }

     if (newPassword !== confirmPassword)
    {
      return res.status(400).json({
        message: "New password and confirm password do not match",
      });
    }

     const admin = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!admin)
    {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

     const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong",
    });
};
}