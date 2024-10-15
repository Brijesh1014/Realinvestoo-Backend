const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_SENDER_EMAIL,
    pass: process.env.EMAIL_SENDER_PASSWORD,
  },
});

const sendEmail = (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_SENDER_EMAIL,
    to,
    subject,
    text,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return reject(error);
      } else {
        console.log("Email sent: ", info.response);
        return resolve(info.response);
      }
    });
  });
};

module.exports = sendEmail;
