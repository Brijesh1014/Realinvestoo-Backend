const Folder = require("../models/folder.model");

const buildFolderPath = async (folderId) => {
  try {
    let path = "";
    let currentFolder = await Folder.findById(folderId);

    if (!currentFolder) {
      throw new Error("Folder not found");
    }

    while (currentFolder) {
      path = `${currentFolder.name}/${path}`;
      currentFolder = currentFolder.parentId
        ? await Folder.findById(currentFolder.parentId)
        : null;
    }

    return path;
  } catch (error) {
    console.error("Error building folder path:", error);
    throw error;
  }
};

module.exports = buildFolderPath;
