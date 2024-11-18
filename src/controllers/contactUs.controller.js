const contactUsModel = require("../models/contactUs.model");
const contactUsSendMail = require("../services/contactUsSendMail.service");
const sendReplyModel = require("../models/replySend.model");
const createContactUs = async (req, res) => {
  try {
    const createdBy = req.userId;
    const { name, email, subject, messageTitle, message, contactNo } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Please enter required details",
      });
    }
    const newContactUs = await contactUsModel.create({
      name,
      email,
      subject,
      messageTitle,
      message,
      createdBy,
      contactNo,
    });

    await contactUsSendMail(
      name,
      (messageSubject = subject),
      messageTitle,
      message,
      email,
      contactNo,
      (receiverEmail = "brijeshl.brainerhub@gmail.com"),
      "",
      "",
      "",
      "../views/contactUs.ejs",
      {
        messageContent: message,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Contact US sent successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
const getAllContactUs = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;
    const contactUs = await contactUsModel
      .find()
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });
    if (!contactUs) {
      res.status(400).json({
        success: true,
        message: "Something went wrong",
        contactUs,
      });
    }
    const totalContactUs = await contactUsModel.countDocuments();
    const totalPages = Math.ceil(totalContactUs / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    res.status(200).json({
      success: true,
      message: "Get all contact us successfully",
      contactUs,
      meta: {
        totalContactUs,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: contactUs.length,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const getContactUsById = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await contactUsModel.findById({ _id: id });

    if (!contact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact entry not found" });
    }
    res.status(200).json({
      success: true,
      message: "Get  contact us by id successfully",
      contact,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteContactUs = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedContact = await contactUsModel.findByIdAndDelete({ _id: id });

    if (!deletedContact) {
      return res
        .status(404)
        .json({ success: false, message: "Contact entry not found" });
    }
    res.status(200).json({
      success: true,
      message: "Contact entry deleted successfully",
      deletedContact,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
const sendReply = async (req, res) => {
  try {
    const { sendReply, id } = req.body;
    if (!sendReply) {
      return res.status(400).json({
        success: false,
        message: "Please enter required details",
      });
    }
    const inquiry = await contactUsModel.findById({ _id: id });
    if (!inquiry) {
      return res
        .status(400)
        .json({ success: false, message: "Inquiry not found" });
    }
    const sendedReply = await sendReplyModel.create({
      sendReply,
      inquiryId: id,
    });
    await contactUsSendMail(
      (name = inquiry.name),
      "",
      "",
      sendReply,
      (email = inquiry.email),
      (receiverEmail = inquiry.email),
      "",
      "",
      "",
      "../views/sendReply.ejs",
      {
        messageContent: sendReply,
      }
    );
    await contactUsModel.findByIdAndUpdate(id, { reply: sendedReply });
    return res.status(200).json({
      success: true,
      message: "Reply sent successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  createContactUs,
  getAllContactUs,
  deleteContactUs,
  getContactUsById,
  sendReply,
};
