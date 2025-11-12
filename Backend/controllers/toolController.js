
import Tools from "../models/tools.js";
import multer from "multer";

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
});

// Create a new tool
export const createTool = [
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, count, price, category } = req.body;
      const image = req.file ? `/Uploads/${req.file.filename}` : undefined;

      // Validate inputs
      if (!name || !price || !category) {
        return res.status(400).json({ message: "Name, price, and category are required" });
      }
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ message: "Price must be a non-negative number" });
      }
      if (!['Power Tools', 'Accessories'].includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      if (category === 'Power Tools' && (count === undefined || isNaN(count) || count < 0)) {
        return res.status(400).json({ message: "Count is required for Power Tools and must be a non-negative number" });
      }

      // Check if tool with same name exists
      const existingTool = await Tools.findOne({ name });
      if (existingTool) {
        return res.status(400).json({ message: "Tool with this name already exists" });
      }

      const newTool = new Tools({
        name,
        count: category === 'Accessories' ? null : parseInt(count),
        price,
        image,
        category,
      });

      await newTool.save();
      res.status(201).json({ message: "Tool created", tool: newTool });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ message: "Tool with this name already exists" });
      }
      res.status(500).json({ message: "Server error" });
    }
  },
];

// Get list of tools
export const getTools = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", category = "" } = req.query;
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (category && ['Power Tools', 'Accessories'].includes(category)) {
      query.category = category;
    }

    const tools = await Tools.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("name count price image category");

    const totalTools = await Tools.countDocuments(query);
    const totalPages = Math.ceil(totalTools / limit);

    res.status(200).json({
      success: true,
      data: tools,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalTools,
        hasMore: page * limit < totalTools,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update an existing tool
export const updateTool = [
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, count, price, category } = req.body;
      const image = req.file ? `/Uploads/${req.file.filename}` : undefined;

      // Validate inputs
      if (!name || !price || !category) {
        return res.status(400).json({ message: "Name, price, and category are required" });
      }
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ message: "Price must be a non-negative number" });
      }
      if (!['Power Tools', 'Accessories'].includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      if (category === 'Power Tools' && (count === undefined || isNaN(count) || count < 0)) {
        return res.status(400).json({ message: "Count is required for Power Tools and must be a non-negative number" });
      }

      // Check if another tool with the same name exists (excluding current tool)
      const existingTool = await Tools.findOne({ name, _id: { $ne: id } });
      if (existingTool) {
        return res.status(400).json({ message: "Tool with this name already exists" });
      }

      // Update tool
      const updateData = {
        name,
        count: category === 'Accessories' ? null : parseInt(count),
        price,
        category,
      };
      if (image) {
        updateData.image = image;
      }

      const updatedTool = await Tools.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updatedTool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      res.status(200).json({ message: "Tool updated successfully", tool: updatedTool });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ message: "Tool with this name already exists" });
      }
      res.status(500).json({ message: "Server error" });
    }
  },
];
