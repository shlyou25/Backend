const planSchema = require('../../../models/packages');
const domainSchema = require('../../../models/domain');
const { packages } = require('../../middlewares/PackagePlan');
const { encryptData, decryptData } = require('../../middlewares/crypto');

exports.adddomain = async (req, res) => {
    try {
        const userId = req.user.id;
        const activePlan = await planSchema.findOne({ userId }).sort({ createdAt: -1 });
        if (!activePlan || activePlan.endingDate < new Date()) {
            return res.status(400).json({ message: "Please get a plan before adding domains." });
        }

        const matchedPlan = packages.find(p => p.title === activePlan.title);
        if (!matchedPlan) {
            return res.status(500).json({ message: "Plan info mismatched." });
        }

        const allowedDomains = matchedPlan.feature;

        let { domains } = req.body;
        if (!domains) {
            return res.status(400).json({ message: "No domains provided." });
        }

        // Normalize input
        if (typeof domains === "string") {
            domains = domains
                .split(/[\n,]/)
                .map(d => d.trim().toLowerCase())
                .filter(Boolean);
        }

        if (!Array.isArray(domains) || domains.length === 0) {
            return res.status(400).json({ message: "Invalid domain format." });
        }
        const seen = new Set();
        const duplicatesInRequest = [];

        domains.forEach(d => {
            if (seen.has(d)) duplicatesInRequest.push(d);
            seen.add(d);
        });

        if (duplicatesInRequest.length > 0) {
            return res.status(400).json({
                message: "Duplicate domains found in your request.",
                duplicates: [...new Set(duplicatesInRequest)],
                status: false
            });
        }
        const existingEncrypted = await domainSchema.find({ userId }).lean();

        const existingPlain = existingEncrypted.map(doc => decryptData(doc.domain));

        const duplicatesInDB = domains.filter(d => existingPlain.includes(d));

        if (duplicatesInDB.length > 0) {
            return res.status(400).json({
                message: "Domains already exist.",
                duplicates: duplicatesInDB
            });
        }
        const existingCount = existingPlain.length;

        if (existingCount + domains.length > allowedDomains) {
            return res.status(400).json({
                message: `Your plan allows ${allowedDomains} domains. 
You already added ${existingCount}. 
You are trying to add ${domains.length}, which exceeds your limit.`
            });
        }
        const docs = domains.map(domain => ({
            domain: encryptData(domain),
            userId
        }));

        await domainSchema.insertMany(docs);

        res.status(200).json({
            message: "Domains added successfully.",
            addedCount: domains.length,
            remaining: allowedDomains - (existingCount + domains.length)
        });

    } catch (error) {
        console.error("AddDomain Error:", error);
        res.status(500).json({ status: false, message: "Error Adding the domain" });
    }
};

exports.getdomainbyuserid = async (req, res) => {
  try {
    const userId = req.user.id;

    const domainsEncrypted = await domainSchema
      .find({ userId })
      .select("_id domain isChatActive isHidden createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const domains = domainsEncrypted.map(d => ({
      id: d._id,
      domain: decryptData(d.domain),
      isChatActive: d.isChatActive,
      isHidden: d.isHidden,
      createdAt: d.createdAt
    }));

    res.status(200).json({
      status: true,
      count: domains.length,
      domains
    });
  } catch (error) {
    console.error("Get Domain Error:", error);
    res.status(500).json({
      status: false,
      message: "Error retrieving domains"
    });
  }
};



exports.getAllDomains = async (req, res) => {
  try {
    const domainsRaw = await domainSchema.find()
      .populate({
        path: "userId",
        match: { role: "user" },        // ✅ filter here
        select: "name email role"
      })
      .sort({ createdAt: -1 })
      .lean();

    // ⚠️ Remove domains whose owner was filtered out
    const domains = domainsRaw
      .filter(d => d.userId)
      .map(d => ({
        domain: decryptData(d.domain),
        createdAt: d.createdAt,
        owner: {
          name: d.userId.name,
          email: d.userId.email
        }
      }));

    return res.status(200).json({
      success: true,
      count: domains.length,
      domains
    });
  } catch (error) {
    console.error("Get domains error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch domains"
    });
  }
};


exports.toggleHide = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const domain = await domainSchema.findOne({ _id: id, userId });
  if (!domain) {
    return res.status(404).json({ message: "Domain not found" });
  }

  domain.isHidden = !domain.isHidden;
  await domain.save();

  res.json({
    message: "Domain visibility updated",
    isHidden: domain.isHidden
  });
};

exports.toggleChat = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const domain = await domainSchema.findOne({ _id: id, userId });
  if (!domain) {
    return res.status(404).json({ message: "Domain not found" });
  }

  domain.isChatActive = !domain.isChatActive;
  await domain.save();

  res.json({
    message: "Chat status updated",
    isChatActive: domain.isChatActive
  });
};

exports.deleteDomain = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const deleted = await domainSchema.findOneAndDelete({
    _id: id,
    userId
  });

  if (!deleted) {
    return res.status(404).json({ message: "Domain not found" });
  }

  res.json({ message: "Domain deleted successfully" });
};

exports.getHiddenDomains = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { isHidden: false };

    const domainsEncrypted = await domainSchema
      .find(filter)
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await domainSchema.countDocuments(filter);

    const domains = domainsEncrypted.map(d => ({
      domainId: d._id,
      domain: decryptData(d.domain),
      user: {
        name: d.userId?.name || "Anonymous"
      },
      isChatActive: d.isChatActive
    }));

    return res.status(200).json({
      success: true,
      domains,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("Get hidden domains error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hidden domains"
    });
  }
};
