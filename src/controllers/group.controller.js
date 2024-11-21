const Group = require("../models/group.model");
const { uploadToCloudinary } = require("../services/cloudinary.service");
const User = require("../models/user.model");
const mongoose = require("mongoose");
const createGroup = async (req, res) => {
  try {
    const { groupName, memberIds } = req.body;

    const members = formatMemberIds(memberIds);
    if (!members) {
      return res.status(400).json({
        success: false,
        message: "Invalid member format",
      });
    }

    if (members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one member is required",
      });
    }

    const invalidObjectIds = members.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidObjectIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID format",
      });
    }

    const missingMembers = await checkMembersExist(members);
    if (missingMembers.length > 0) {
      return res.status(404).json({
        success: false,
        message: `One or more members not found: ${missingMembers.join(", ")}`,
      });
    }
    let imageUrl;
    if (req.file) {
      const validationResult = validateImage(req.file);
      if (validationResult.error) {
        return res.status(400).json({
          success: false,
          message: validationResult.message,
        });
      }
      imageUrl = await uploadToCloudinary(req.file);
    }

    const groupMembers = [
      { userId: req.userId, role: "admin" },
      ...members.map((id) => ({ userId: id, role: "member" })), 
    ];

    const newGroup = new Group({
      groupName,
      members: groupMembers,
      createdBy: req.userId,
      groupImage: imageUrl,
    });

    await newGroup.save();

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: newGroup,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    return res.status(500).json({
      success: false,
      message: "Could not create group",
      error: error.message,
    });
  }
};

const formatMemberIds = (memberIds) => {
  if (!memberIds) return [];
  try {
    return memberIds
      .replace(/[\[\]]/g, "")
      .split(",")
      .map((id) => id.trim());
  } catch (error) {
    return null;
  }
};

const checkMembersExist = async (members) => {
  const memberChecks = await Promise.all(
    members.map((memberId) => User.findById(memberId))
  );
  return members.filter((_, index) => !memberChecks[index]);
};

const validateImage = (file) => {
  if (!file.mimetype.startsWith("image/")) {
    return { error: true, message: "The uploaded file must be an image" };
  }
  return { error: false };
};

const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { adminId, newMemberId } = req.body;
    const group = await Group.findById(groupId);
    const admin = group.members.find(
      (member) => member.userId.equals(adminId) && member.role === "admin"
    );

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Only admins can add members",
      });
    }

    group.members.push({ userId: newMemberId, role: "member" });
    await group.save();

    return res.status(200).json({
      success: true,
      message: "Member added successfully",
      data: group,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Could not add member to group",
      error: error.message,
    });
  }
};

const removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { adminId, memberIdToRemove } = req.body;
    const group = await Group.findById(groupId);
    const admin = group.members.find(
      (member) => member.userId.equals(adminId) && member.role === "admin"
    );

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Only admins can remove members",
      });
    }

    group.members = group.members.filter(
      (member) => !member.userId.equals(memberIdToRemove)
    );
    await group.save();

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: group,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Could not remove member from group",
      error: error.message,
    });
  }
};

const promoteMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { adminId, memberIdToPromote } = req.body;
    const userId = req.userId;
    const group = await Group.findById(groupId);
    const admin = group.members.find(
      (member) => member.userId.equals(adminId) && member.role === "admin"
    );

    if (!admin && group.createdBy != userId) {
      return res.status(403).json({
        success: false,
        message: "Only admins can promote members",
      });
    }

    const memberToPromote = group.members.find((member) =>
      member.userId.equals(memberIdToPromote)
    );
    if (memberToPromote) {
      memberToPromote.role = "admin";
      await group.save();
      return res.status(200).json({
        success: true,
        message: "Member promoted to admin successfully",
        data: group,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Could not promote member",
      error: error.message,
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const admin = group.members.find(
      (member) => member.userId.equals(userId) && member.role === "admin"
    );

    if (!admin && group.createdBy != userId) {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete the group",
      });
    }

    await Group.findByIdAndDelete(groupId);

    res.status(200).json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not delete group",
      error: error.message,
    });
  }
};

const updateGroupDetails = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;
  const { groupName, members } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }
    if (groupName) {
      group.groupName = groupName;
    }

    if (members && Array.isArray(members)) {
      members.forEach((member) => {
        const memberToUpdate = group.members.find((m) =>
          m.userId.equals(member.userId)
        );
        if (memberToUpdate) {
          memberToUpdate.role = member.role;
        }
      });
    }

    if (req.file) {
      const validationResult = validateImage(req.file);
      if (validationResult.error) {
        return res.status(400).json({
          success: false,
          message: validationResult.message,
        });
      }

      const imageUrl = await uploadToCloudinary(req.file);
      group.groupImage = imageUrl;
    }

    await group.save();

    res.status(200).json({
      success: true,
      message: "Group details updated successfully",
      data: group,
    });
  } catch (error) {
    console.error("Error updating group details:", error);
    res.status(500).json({
      success: false,
      message: "Could not update group details",
      error: error.message,
    });
  }
};

const getAllGroups = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;
    const groups = await Group.find()
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });
    const totalGroups = await Group.countDocuments();
    const totalPages = Math.ceil(totalGroups / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;
    return res.status(200).json({
      success: true,
      data: groups,
      meta: {
        totalGroups,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: groups.length,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve groups",
      error: error.message,
    });
  }
};
const getGroupsByUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;
    const query = {
      $or: [{ createdBy: userId }, { "members.userId": userId }],
    };
    const groups = await Group.find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    const totalGroups = await Group.countDocuments(query);
    const totalPages = Math.ceil(totalGroups / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      data: groups,
      meta: {
        totalGroups,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve groups",
      error: error.message,
    });
  }
};

module.exports = {
  createGroup,
  addMember,
  removeMember,
  promoteMember,
  deleteGroup,
  updateGroupDetails,
  getAllGroups,
  getGroupsByUser,
};
