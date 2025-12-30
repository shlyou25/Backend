const Faq=require('../../../models/faq')

exports.createFaq = async (req, res) => {
  try {
    const { question, answer, priorityNumber } = req.body;

    if (!question || !answer || priorityNumber === undefined) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 🔒 Check duplicate priority
    const existingPriority = await Faq.findOne({ priorityNumber });
    if (existingPriority) {
      return res.status(409).json({
        success: false,
        message: "FAQ with this priority already exists",
      });
    }

    const faq = await Faq.create({
      question,
      answer,
      priorityNumber,
    });

    return res.status(201).json({
      success: true,
      message:"FAQ Added"
    });
  } catch (error) {
    console.error("Create FAQ error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create FAQ",
    });
  }
};

exports.getAllFaqs = async (req, res) => {
  try {
    const faqs = await Faq.find()
      .select('question answer priorityNumber')
      .sort({ priorityNumber: 1 })
      .lean();
    return res.status(200).json({
      success: true,
      faqs,
    });
  } catch (error) {
    console.error("Get FAQs error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs",
    });
  }
};




exports.updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, priorityNumber } = req.body;

    // 🔒 Check priority conflict
    if (priorityNumber !== undefined) {
      const conflict = await Faq.findOne({
        priorityNumber,
        _id: { $ne: id },
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: "Another FAQ already uses this priority",
        });
      }
    }

    const updatedFaq = await Faq.findByIdAndUpdate(
      id,
      { question, answer, priorityNumber },
      { new: true, runValidators: true }
    );

    if (!updatedFaq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      faq: updatedFaq,
    });
  } catch (error) {
    console.error("Update FAQ error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update FAQ",
    });
  }
};
exports.deleteFaq = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Faq.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Delete FAQ error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete FAQ",
    });
  }
};
