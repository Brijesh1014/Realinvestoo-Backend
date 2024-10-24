const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_SENDER_EMAIL,
    pass: process.env.EMAIL_SENDER_PASSWORD,
  },
});

const sendEmail = (to, subject, text, html = null) => {
  const mailOptions = {
    from: process.env.EMAIL_SENDER_EMAIL,
    to,
    subject,
    text,
    ...(html && { html }),
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

async function nodeMailerFunc(from, to, subject, text, html) {
  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };

  let response = await transporter.sendMail(mailOptions);
  return response;
}

module.exports = {
  sendEmail,
  nodeMailerFunc,
};
