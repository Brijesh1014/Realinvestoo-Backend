const ejs = require("ejs");
const { nodeMailerFunc } = require("../utils/email.utils");
const fs = require("fs");
const path = require("path");

const sendMail = async (name, email, receiverEmail, subject, text, html) => {
  try {
    await nodeMailerFunc(email, receiverEmail, subject, text, html);
    console.log(`Mail sent to ${receiverEmail}`);
  } catch (err) {
    console.log(`Mail error: ${err}`);
  }
};

const contactUsSendMail = async (
  name,
  messageSubject,
  messageTitle,
  message,
  email,
  receiverEmail,
  content = "",
  page = "test-template",
  text = "",
  ejsPath
) => {
  const subject = "Contact Us";
  const ejsProps = {
    receiver: "",
    content,
    page,
    name,
    email,
    messageSubject,
    messageTitle,
    messageContent: message,
  };

  if (!ejsPath) {
    throw new Error("ejsPath is required");
  }
  const absoluteEjsPath = path.join(__dirname, ejsPath);
  console.log("absoluteEjsPath: ", absoluteEjsPath);
  try {
    const ejsContent = fs.readFileSync(absoluteEjsPath, "utf8");
    const renderedContent = ejs.render(ejsContent, ejsProps);
    await sendMail(name, email, receiverEmail, subject, text, renderedContent);
  } catch (err) {
    console.log(`Error reading or rendering EJS file: ${err}`);
  }
};

module.exports = contactUsSendMail;
