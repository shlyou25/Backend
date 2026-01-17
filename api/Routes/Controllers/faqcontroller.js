const Faq=require('../../../models/faq')

exports.createFaq = async (req, res) => {
  try {
    const { question, answer, category, priorityNumber } = req.body;

    if (!question || !answer || !category || priorityNumber === undefined) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const conflict = await Faq.findOne({
      category,
      priorityNumber
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Priority ${priorityNumber} already exists in ${category}`
      });
    }

    await Faq.create({
      question,
      answer,
      category,
      priorityNumber
    });

    return res.status(201).json({
      success: true,
      message: "FAQ added successfully"
    });

  } catch (error) {
    console.error("Create FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create FAQ"
    });
  }
};


exports.getAllFaqs = async (req, res) => {
  try {
    const faqs = await Faq.find()
      .select("question answer category priorityNumber")
      .sort({ category: 1, priorityNumber: 1 }) // ✅ category-wise
      .lean();

    return res.status(200).json({
      success: true,
      faqs
    });
  } catch (error) {
    console.error("Get FAQs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs"
    });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const { id, question, answer, category, priorityNumber } = req.body;

    if (priorityNumber !== undefined && category) {
      const conflict = await Faq.findOne({
        category,
        priorityNumber,
        _id: { $ne: id }
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Priority ${priorityNumber} already used in ${category}`
        });
      }
    }

    const updatedFaq = await Faq.findByIdAndUpdate(
      id,
      { question, answer, category, priorityNumber },
      { new: true, runValidators: true }
    );

    if (!updatedFaq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found"
      });
    }

    return res.status(200).json({
      success: true,
      faq: updatedFaq
    });

  } catch (error) {
    console.error("Update FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update FAQ"
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
        message: "FAQ not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully"
    });

  } catch (error) {
    console.error("Delete FAQ error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete FAQ"
    });
  }
};

