const Amenities = require("../models//amenities.model");
const Property = require("../models/property.model");

const createAmenities = async (req, res) => {
    try {
        const userId = req.userId;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
            });
        }

        const isExist = await Amenities.findOne({ name });
        if (isExist) {
            return res.status(400).json({
                success: false,
                message: "Amenities name is already exists",
            });
        }

        const amenities = await Amenities.create({
            name,
            createdBy: userId,
        });

        return res.status(201).json({
            success: true,
            message: "Amenities created successfully",
            data: amenities,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

const getAllAmenities = async (req, res) => {
    try {
        const { search } = req.query;
        const query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        const amenities = await Amenities.find(query);
        return res.status(200).json({
            success: true,
            data: amenities,
            message: "Amenities retrieved successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

const getAmenitiesTypeById = async (req, res) => {
    try {
        const { id } = req.params;
        const amenities = await Amenities.findById(id);

        if (!amenities) {
            return res.status(404).json({
                success: false,
                message: "Amenities not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: amenities,
            message: "Amenities retrieved successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

const updateAmenities = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
            });
        }

        let amenities = await Amenities.findById(id);
        if (!amenities) {
            return res.status(404).json({
                success: false,
                message: "Property Type not found",
            });
        }

        const isExist = await Amenities.findOne({ name });
        if (isExist && isExist.id !== id) {
            return res.status(400).json({
                success: false,
                message: "Amenities name already exists",
            });
        }

        amenities = await Amenities.findByIdAndUpdate(
            id,
            { name },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Amenities updated successfully",
            data: amenities,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

const deleteAmenities = async (req, res) => {
    try {
        const { id } = req.params;

        const amenities = await Amenities.findById(id);
        if (!amenities) {
            return res.status(404).json({
                success: false,
                message: "Amenities not found",
            });
        }

        await Property.updateMany({ amenities: id }, { $unset: { amenities: "" } });

        await Amenities.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Amenities deleted successfully and removed from properties",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

module.exports = {
    createAmenities,
    getAllAmenities,
    getAmenitiesTypeById,
    updateAmenities,
    deleteAmenities,
};
