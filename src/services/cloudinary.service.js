const cloudinary = require("cloudinary").v2;

const configureCloudinary = () => {
  if (
    !process.env.CLOUD_NAME ||
    !process.env.API_KEY ||
    !process.env.API_SECRET
  ) {
    throw new Error(
      "Missing Cloudinary configuration. Please check your environment variables."
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    secure: true,
  });
};

configureCloudinary();

const uploadToCloudinary = async (file) => {
  try {
    if (!file || !file.path) {
      throw new Error("Invalid file. Please provide a valid file to upload.");
    }

    const result = await cloudinary.uploader.upload(file.path, {
      secure: true,
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error: ", error.message || error);
    throw new Error("Failed to upload image to Cloudinary.");
  }
};

module.exports = { uploadToCloudinary, cloudinary };
