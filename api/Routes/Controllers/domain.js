const axios = require("axios");
const planSchema = require('../../../models/packages');
const domainSchema = require('../../../models/domain');
// const { packages } = require('../../middlewares/PackagePlan');
const { encryptData, decryptData } = require('../../middlewares/crypto');


// this code is with validation
// exports.adddomain = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const activePlan = await planSchema.findOne({ userId }).sort({ createdAt: -1 });
//         if (!activePlan || activePlan.endingDate < new Date()) {
//             return res.status(400).json({ message: "Please get a plan before adding domains." });
//         }

//         const matchedPlan = packages.find(p => p.title === activePlan.title);
//         if (!matchedPlan) {
//             return res.status(500).json({ message: "Plan info mismatched." });
//         }

//         const allowedDomains = matchedPlan.feature;

//         let { domains } = req.body;
//         if (!domains) {
//             return res.status(400).json({ message: "No domains provided." });
//         }

//         // Normalize input
//         if (typeof domains === "string") {
//             domains = domains
//                 .split(/[\n,]/)
//                 .map(d => d.trim().toLowerCase())
//                 .filter(Boolean);
//         }

//         if (!Array.isArray(domains) || domains.length === 0) {
//             return res.status(400).json({ message: "Invalid domain format." });
//         }
//         const seen = new Set();
//         const duplicatesInRequest = [];

//         domains.forEach(d => {
//             if (seen.has(d)) duplicatesInRequest.push(d);
//             seen.add(d);
//         });

//         if (duplicatesInRequest.length > 0) {
//             return res.status(400).json({
//                 message: "Duplicate domains found in your request.",
//                 duplicates: [...new Set(duplicatesInRequest)],
//                 status: false
//             });
//         }
//         const existingEncrypted = await domainSchema.find({ userId }).lean();

//         const existingPlain = existingEncrypted.map(doc => decryptData(doc.domain));

//         const duplicatesInDB = domains.filter(d => existingPlain.includes(d));

//         if (duplicatesInDB.length > 0) {
//             return res.status(400).json({
//                 message: "Domains already exist.",
//                 duplicates: duplicatesInDB
//             });
//         }
//         const existingCount = existingPlain.length;

//         if (existingCount + domains.length > allowedDomains) {
//             return res.status(400).json({
//                 message: `Your plan allows ${allowedDomains} domains. 
// You already added ${existingCount}. 
// You are trying to add ${domains.length}, which exceeds your limit.`
//             });
//         }
//         const docs = domains.map(domain => ({
//             domain: encryptData(domain),
//             userId
//         }));

//         await domainSchema.insertMany(docs);

//         res.status(200).json({
//             message: "Domains added successfully.",
//             addedCount: domains.length,
//             remaining: allowedDomains - (existingCount + domains.length)
//         });

//     } catch (error) {
//         console.error("AddDomain Error:", error);
//         res.status(500).json({ status: false, message: "Error Adding the domain" });
//     }
// };


exports.adddomain = async (req, res) => {
  try {
    const userId = req.user.id;
    const activePlan = await planSchema
      .findOne({ userId })
      .sort({ createdAt: -1 });

    if (!activePlan || activePlan.endingDate < new Date()) {
      return res.status(400).json({
        message: "Please get a plan before adding domains.",
      });
    }

    const allowedDomains = activePlan.feature;
    let { domains } = req.body;

    if (!domains) {
      return res.status(400).json({ message: "No domains provided." });
    }

    let normalizedDomains = [];
    if (typeof domains === "string") {
      normalizedDomains = domains
        .split(/[\n,]+/)
        .map((d) => ({
          domainName: d.trim().toLowerCase(),
          url: null,
        }))
        .filter((d) => d.domainName);
    }
    else if (Array.isArray(domains)) {
      normalizedDomains = domains
        .map((d) => {
          if (typeof d === "string") {
            return { domainName: d.trim().toLowerCase(), url: null };
          }

          if (
            typeof d === "object" &&
            typeof d.domainName === "string"
          ) {
            return {
              domainName: d.domainName.trim().toLowerCase(),
              url:
                typeof d.url === "string" && d.url.trim()
                  ? d.url.trim()
                  : null,
            };
          }

          return null;
        })
        .filter(Boolean);
    } else {
      return res.status(400).json({ message: "Invalid domains format." });
    }

    if (!normalizedDomains.length) {
      return res.status(400).json({ message: "No valid domains provided." });
    }
    const seen = new Set();
    const duplicatesInRequest = [];

    for (const d of normalizedDomains) {
      if (seen.has(d.domainName)) {
        duplicatesInRequest.push(d.domainName);
      }
      seen.add(d.domainName);
    }

    if (duplicatesInRequest.length) {
      return res.status(400).json({
        message: "Duplicate domains in request.",
        duplicates: [...new Set(duplicatesInRequest)],
      });
    }
    const existingEncrypted = await domainSchema
      .find({ userId })
      .select("domain")
      .lean();

    const existingPlain = existingEncrypted.map((d) =>
      decryptData(d.domain)
    );

    const duplicatesInDB = normalizedDomains
      .map((d) => d.domainName)
      .filter((d) => existingPlain.includes(d));

    if (duplicatesInDB.length) {
      return res.status(400).json({
        message: "Domains already exist.",
        duplicates: duplicatesInDB,
      });
    }
    const lookupMap = new Map();

    for (const d of normalizedDomains) {
      const checkerKey = d.url ? d.url : d.domainName;
      lookupMap.set(checkerKey, d);
    }

    const checkerPayload = [...lookupMap.keys()];
    let apiResponse;
    try {
      apiResponse = await axios.post(
        "https://8431765a5cb6.ngrok-free.app/check_domains",
        { domains: checkerPayload }
      );
    } catch {
      return res.status(502).json({
        message: "Domain verification service unavailable.",
      });
    }

    const results = Array.isArray(apiResponse.data?.results)
      ? apiResponse.data.results
      : [];
    const passDomains = [];
    const manualDomains = [];
    const failedDomains = [];

    for (const r of results) {
      if (r.status === "Pass") passDomains.push(r);
      else if (r.status === "Manual Review") manualDomains.push(r);
      else failedDomains.push(r);
    }

    const existingCount = existingPlain.length;
    const totalToInsert = passDomains.length + manualDomains.length;

    /* ------------------ PLAN LIMIT CHECK ------------------ */
    if (
      allowedDomains !== -1 &&
      existingCount + totalToInsert > allowedDomains
    ) {
      return res.status(400).json({
        message: `Your plan allows ${allowedDomains} domains.
You already added ${existingCount}.
You can add only ${allowedDomains - existingCount} more.`,
        pass: passDomains.map((d) => d.domain),
        manualReview: manualDomains.map((d) => d.domain),
        failed: failedDomains.map((d) => d.domain),
      });
    }

    /* ------------------ INSERT DOMAINS ------------------ */
    const docs = [...passDomains, ...manualDomains, ...failedDomains].map(
      (r) => {
        const original = lookupMap.get(r.domain);

        return {
          domain: encryptData(original.domainName), // ✅ always domainName
          userId,
          status: r.status,
          finalUrl: original.url
            ? original.url // ✅ frontend URL
            : r.final_url || null, // ✅ checker URL only if no frontend URL
        };
      }
    );

    if (docs.length) {
      await domainSchema.insertMany(docs);
    }

    /* ------------------ RESPONSE ------------------ */
    return res.status(200).json({
      message: "Domain processing completed.",
      added: passDomains.map((d) => d.domain),
      manualReview: manualDomains.map((d) => d.domain),
      failed: failedDomains.map((d) => d.domain),
      remaining:
        allowedDomains === -1
          ? "Unlimited"
          : allowedDomains - (existingCount + totalToInsert),
    });
  } catch (error) {
    console.error("AddDomain Error:", error);
    return res.status(500).json({
      message: "Error adding domains",
    });
  }
};



exports.getdomainbyuserid = async (req, res) => {
  try {
    const userId = req.user.id;
    const domainsEncrypted = await domainSchema
      .find({ userId })
      .select("_id domain isChatActive isHidden createdAt finalUrl status")
      .sort({ createdAt: -1 })
      .lean();

    const domains = domainsEncrypted.map(d => ({
      id: d._id,
      domain: decryptData(d.domain),
      status: d.status,
      isChatActive: d.isChatActive,
      isHidden: d.isHidden,
      createdAt: d.createdAt,
      finalUrl: d.finalUrl
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
    const domainsRaw = await domainSchema
      .find()
      .populate({
        path: "userId",
        select: "name email role" // ❌ remove match
      })
      .sort({ createdAt: -1 })
      .lean();

    // 🔢 COUNT FROM RAW DATA
    const manualReviewCount = domainsRaw.filter(
      d => d.status === "Manual Review"
    ).length;
    // ⚠️ FILTER ONLY FOR RESPONSE
    const filtered = domainsRaw.filter(
      d => d.userId && d.userId.role === "user"
    );

    const domains = filtered.map(d => ({
      domainId: d._id,
      domain: decryptData(d.domain),
      status: d.status,
      finalUrl: d.finalUrl || null,
      promotedNumber: d.isPromoted ? d.promotionPriority : null,
      createdAt: d.createdAt,
      owner: {
        name: d.userId.name,
        email: d.userId.email
      }
    }));

    return res.status(200).json({
      success: true,
      count: domains.length,
      manualReviewCount,
      domains
    });

  } catch (error) {
    console.error("Get domains error:", error);
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

exports.AdmindeleteDomain = async (req, res) => {
  try {
    const { domainId } = req.params;
    if (!domainId) {
      return res.status(400).json({
        success: false,
        message: "domainId is required",
      });
    }

    const domain = await domainSchema.findById(domainId);
    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Domain not found",
      });
    }

    await domainSchema.findByIdAndDelete(domainId);

    return res.status(200).json({
      success: true,
      message: "Domain deleted successfully",
    });
  } catch (error) {
    console.error("deleteDomain error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
exports.deleteDomain = async (req, res) => {
  try {
    const { domainId } = req.params;
    const userId = req.user.id; // 🔐 from auth middleware

    if (!domainId) {
      return res.status(400).json({
        success: false,
        message: "domainId is required",
      });
    }

    const deleted = await domainSchema.findOneAndDelete({
      _id: domainId,
      userId, // 🔥 enforce ownership
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Domain not found or not authorized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Domain deleted successfully",
    });
  } catch (error) {
    console.error("deleteDomain error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.deleteBulkDomains = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id; // 🔐 user from auth middleware

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ids must be a non-empty array",
      });
    }

    const result = await domainSchema.deleteMany({
      _id: { $in: ids },
      userId, // 🔥 enforce ownership
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No domains found or not authorized to delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Domains deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("deleteBulkDomains error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// exports.getHiddenDomains = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const filter = { isHidden: false, status:"Pass"};

//     const domainsEncrypted = await domainSchema
//       .find(filter)
//       .populate("userId", "name")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     const total = await domainSchema.countDocuments(filter);

//     const domains = domainsEncrypted.map(d => ({
//       domainId: d._id,
//       domain: decryptData(d.domain),
//       user: {
//         name: d.userId?.name || "Anonymous"
//       },
//       isChatActive: d.isChatActive,
//       finalUrl:d.finalUrl
//     }));

//     return res.status(200).json({
//       success: true,
//       domains,
//       total,
//       page,
//       totalPages: Math.ceil(total / limit)
//     });

//   } catch (error) {
//     console.error("Get hidden domains error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch hidden domains"
//     });
//   }
// };

exports.getHiddenDomains = async (req, res) => {
  try {
    const MAX_ALL_LIMIT = 3000;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const fetchAll = req.query.all === 'true';

    const skip = (page - 1) * limit;
    const filter = { isHidden: false, status: "Pass" };

    let query = domainSchema
      .find(filter)
      .select("_id domain isChatActive finalUrl userId createdAt")
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    // ✅ SAFE ALL MODE
    if (fetchAll) {
      query = query.limit(MAX_ALL_LIMIT);
    } else {
      query = query.skip(skip).limit(limit);
    }

    const domainsEncrypted = await query.lean();
    const total = await domainSchema.countDocuments(filter);

    const domains = domainsEncrypted.map(d => ({
      domainId: d._id,
      domain: decryptData(d.domain),
      user: {
        name: d.userId?.name || "Anonymous"
      },
      isChatActive: d.isChatActive,
      finalUrl: d.finalUrl || null
    }));

    return res.status(200).json({
      success: true,
      domains,
      total,
      page,
      totalPages: fetchAll ? 1 : Math.ceil(total / limit),
      capped: fetchAll && total > MAX_ALL_LIMIT,
      capLimit: MAX_ALL_LIMIT
    });

  } catch (error) {
    console.error("Get hidden domains error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch hidden domains"
    });
  }
};



exports.promoteDomain = async (req, res) => {
  try {
    const { domainId, priority } = req.body;

    if (!Number.isInteger(priority) || priority <= 0) {
      return res.status(400).json({
        message: "Priority must be a positive integer"
      });
    }

    const domain = await domainSchema.findById(domainId);
    if (!domain) {
      return res.status(404).json({ message: "Domain not found" });
    }

    if (domain.status !== "Pass") {
      return res.status(403).json({
        message: "Only PASS domains can be promoted"
      });
    }

    // 🚫 Slot check (NO shifting)
    const occupied = await domainSchema.findOne({
      promotionPriority: priority,
      isPromoted: true,
      _id: { $ne: domainId }
    });

    if (occupied) {
      return res.status(409).json({
        message: `Priority slot ${priority} is already occupied`,
        assignedTo: decryptData(occupied.domain)
      });
    }

    await domainSchema.findByIdAndUpdate(domainId, {
      isPromoted: true,
      promotionPriority: priority
    });

    return res.status(200).json({
      message: "Domain promoted successfully"
    });

  } catch (error) {
    console.error("Promote domain error:", error);
    return res.status(500).json({ message: "Failed to promote domain" });
  }
};



exports.removePromotion = async (req, res) => {
  try {
    const { domainId } = req.params;

    const domain = await domainSchema.findById(domainId);
    if (!domain) {
      return res.status(404).json({ message: "Domain not found" });
    }

    domain.isPromoted = false;
    domain.promotionPriority = null;
    await domain.save();

    return res.status(200).json({
      message: "Promotion removed successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to remove promotion" });
  }
};


exports.updateDomainPriority = async (req, res) => {
  try {
    const { domainId } = req.params;
    const { priority } = req.body;

    if (!Number.isInteger(priority) || priority <= 0) {
      return res.status(400).json({
        message: "Priority must be a positive integer"
      });
    }

    const domain = await domainSchema.findById(domainId);
    if (!domain || !domain.isPromoted) {
      return res.status(404).json({
        message: "Promoted domain not found"
      });
    }

    const conflict = await domainSchema.findOne({
      promotionPriority: priority,
      isPromoted: true,
      _id: { $ne: domainId }
    });

    if (conflict) {
      return res.status(409).json({
        message: `Priority slot ${priority} already in use`,
        assignedTo: decryptData(conflict.domain)
      });
    }

    await domainSchema.findByIdAndUpdate(domainId, {
      promotionPriority: priority
    });

    return res.status(200).json({
      message: "Priority updated successfully"
    });

  } catch (error) {
    console.error("Update priority error:", error);
    return res.status(500).json({ message: "Failed to update priority" });
  }
};


exports.removeDomainPriority = async (req, res) => {
  try {
    const { domainId } = req.params;

    const domain = await domainSchema.findByIdAndUpdate(
      domainId,
      {
        $set: { isPromoted: false },
        $unset: { promotionPriority: "" }
      },
      { new: true }
    );

    if (!domain) {
      return res.status(404).json({ message: "Domain not found" });
    }

    return res.status(200).json({
      message: "Promotion removed successfully"
    });

  } catch (error) {
    console.error("Remove promotion error:", error);
    return res.status(500).json({ message: "Failed to remove promotion" });
  }
};


exports.getPromotedDomains = async (req, res) => {
  try {
    const promotedDomainsRaw = await domainSchema
      .find({
        isPromoted: true,
        promotionPriority: { $ne: null }
      })
      .sort({ promotionPriority: 1 })   // ✅ LOWEST first
      .limit(3)
      .select("_id domain promotionPriority")
      .lean();

    const promotedDomains = promotedDomainsRaw.map(d => ({
      domainId: d._id,
      domain: decryptData(d.domain),     // 🔓 decrypted
      priority: d.promotionPriority
    }));

    return res.status(200).json({
      success: true,
      domains: promotedDomains
    });

  } catch (error) {
    console.error("Get promoted domains error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch promoted domains"
    });
  }
};

// exports.getAllDomains = async (req, res) => {
//   try {
//     const domainsRaw = await domainSchema
//       .find({})
//       .sort({
//         isPromoted: -1,           // promoted first
//         promotionPriority: 1,     // lower priority number first
//         createdAt: -1             // fallback order
//       })
//       .select("_id domain promotionPriority isPromoted status finalUrl")
//       .lean();

//     const domains = domainsRaw.map(d => ({
//       domainId: d._id,
//       domain: decryptData(d.domain),
//       isPromoted: d.isPromoted,
//       priority: d.promotionPriority ?? null,
//       status: d.status,
//       finalUrl: d.finalUrl
//     }));

//     return res.status(200).json({
//       success: true,
//       count: domains.length,
//       domains
//     });

//   } catch (error) {
//     console.error("Get all domains error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch domains"
//     });
//   }
// };



exports.getAllPromotedDomains = async (req, res) => {
  try {
    const domains = await domainSchema
      .find({ isPromoted: true })
      .sort({ promotionPriority: 1 }) // ✅ DISPLAY ONLY
      .select("_id domain promotionPriority status finalUrl");

    return res.status(200).json({
      domains: domains.map(d => ({
        domainId: d._id,
        domain: decryptData(d.domain),
        priority: d.promotionPriority,
        status: d.status,
        finalUrl: d.finalUrl
      }))
    });

  } catch (error) {
    console.error("Get promoted domains error:", error);
    return res.status(500).json({ message: "Failed to fetch promoted domains" });
  }
};

exports.changeDomainStatus = async (req, res) => {
  try {
    const { domainId, status, finalUrl } = req.body;

    if (!domainId || !status) {
      return res.status(400).json({
        success: false,
        message: "domainId and status are required",
      });
    }

    const ALLOWED_STATUSES = ["Pass", "Fail", "Manual Review"];

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const domain = await domainSchema.findById(domainId);

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: "Domain not found",
      });
    }

    // No-op safeguard
    if (domain.status === status) {
      return res.status(200).json({
        success: true,
        message: "Status already up to date",
        data: domain,
      });
    }

    /**
     * 🔒 RULE:
     * ANY → Pass requires finalUrl
     */
    if (status === "Pass") {
      if (!finalUrl || typeof finalUrl !== "string") {
        return res.status(400).json({
          success: false,
          message: "Final URL is required when marking domain as Pass",
        });
      }

      // URL validation
      try {
        new URL(finalUrl);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid final URL format",
        });
      }

      domain.finalUrl = finalUrl;
    }

    /**
     * Optional cleanup:
     * Clear finalUrl if moving away from Pass
     */
    if (domain.status === "Pass" && status !== "Pass") {
      domain.finalUrl = null;
    }

    domain.status = status;
    await domain.save();

    return res.status(200).json({
      success: true,
      message: "Domain status updated successfully",
      data: {
        domainId: domain._id,
        status: domain.status,
        finalUrl: domain.finalUrl,
      },
    });

  } catch (error) {
    console.error("changeDomainStatus error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



