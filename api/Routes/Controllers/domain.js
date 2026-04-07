// const axios = require("axios");
const planSchema = require('../../../models/packages');
const domainSchema = require('../../../models/domain');
const userSchema = require('../../../models/user')
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


// exports.adddomain = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const activePlan = await planSchema
//       .findOne({ userId })
//       .sort({ createdAt: -1 });

//     if (!activePlan || activePlan.endingDate < new Date()) {
//       return res.status(400).json({
//         message: "Please get a plan before adding domains.",
//       });
//     }

//     const allowedDomains = activePlan.feature;
//     let { domains } = req.body;

//     if (!domains) {
//       return res.status(400).json({ message: "No domains provided." });
//     }

//     let normalizedDomains = [];
//     if (typeof domains === "string") {
//       normalizedDomains = domains
//         .split(/[\n,]+/)
//         .map((d) => ({
//           domainName: d.trim(),
//           url: null,
//         }))
//         .filter((d) => d.domainName);
//     }
//     else if (Array.isArray(domains)) {
//       normalizedDomains = domains
//         .map((d) => {
//           if (typeof d === "string") {
//             return { domainName: d.trim(), url: null };
//           }

//           if (
//             typeof d === "object" &&
//             typeof d.domainName === "string"
//           ) {
//             return {
//               domainName: d.domainName.trim(),
//               url:
//                 typeof d.url === "string" && d.url.trim()
//                   ? d.url.trim()
//                   : null,
//             };
//           }

//           return null;
//         })
//         .filter(Boolean);
//     } else {
//       return res.status(400).json({ message: "Invalid domains format." });
//     }

//     if (!normalizedDomains.length) {
//       return res.status(400).json({ message: "No valid domains provided." });
//     }
//     const seen = new Set();
//     const duplicatesInRequest = [];

//     for (const d of normalizedDomains) {
//       if (seen.has(d.domainName)) {
//         duplicatesInRequest.push(d.domainName);
//       }
//       seen.add(d.domainName);
//     }

//     if (duplicatesInRequest.length) {
//       return res.status(400).json({
//         message: "Duplicate domains in request.",
//         duplicates: [...new Set(duplicatesInRequest)],
//       });
//     }
//     const existingEncrypted = await domainSchema
//       .find({ userId })
//       .select("domain")
//       .lean();

//     const existingPlain = existingEncrypted.map((d) =>
//       decryptData(d.domain)
//     );

//     const duplicatesInDB = normalizedDomains
//       .map((d) => d.domainName)
//       .filter((d) => existingPlain.includes(d));

//     if (duplicatesInDB.length) {
//       return res.status(400).json({
//         message: "Domains already exist.",
//         duplicates: duplicatesInDB,
//       });
//     }
//     const lookupMap = new Map();

//     for (const d of normalizedDomains) {
//       const checkerKey = (d.url ? d.url : d.domainName).toLowerCase();
//       lookupMap.set(checkerKey, d);
//     }

//     const checkerPayload = [...lookupMap.keys()];
//     let apiResponse;
//     try {
//       apiResponse = await axios.post(
//         "https://domain-analyser-g5oce.ondigitalocean.app/check_domains",
//         { domains: checkerPayload }
//       );
//     } catch {
//       return res.status(502).json({
//         message: "Domain verification service unavailable.",
//       });
//     }
//     const results = Array.isArray(apiResponse.data?.results)
//       ? apiResponse.data.results
//       : [];
//     const passDomains = [];
//     const manualDomains = [];
//     const failedDomains = [];

//     for (const r of results) {
//       if (r.status === "Pass") passDomains.push(r);
//       else if (r.status === "Manual Review") manualDomains.push(r);
//       else failedDomains.push(r);
//     }

//     const existingCount = existingPlain.length;
//     const totalToInsert = passDomains.length + manualDomains.length;
//     if (
//       allowedDomains !== -1 &&
//       existingCount + totalToInsert > allowedDomains
//     ) {
//       return res.status(400).json({
//         message: `Your plan allows ${allowedDomains} domains.
// You already added ${existingCount}.
// You can add only ${allowedDomains - existingCount} more.`,
//         pass: passDomains.map((d) => d.domain),
//         manualReview: manualDomains.map((d) => d.domain),
//         failed: failedDomains.map((d) => d.domain),
//       });
//     }

//     const docs = [...passDomains, ...manualDomains, ...failedDomains].map(
//       (r) => {
//         const original = lookupMap.get((r.domain || "").toLowerCase());
//         if (!original) return null;

//         return {
//           domain: encryptData(original.domainName),
//           domainSearch: original.domainName.toLowerCase(),
//           userId,
//           status: r.status,
//           finalUrl: original.url
//             ? original.url
//             : r.final_url || null,
//         };
//       }
//     );

//     if (docs.length) {
//       await domainSchema.insertMany(docs);
//     }

//     return res.status(200).json({
//       message: "Domain processing completed.",
//       added: passDomains.map((d) => d.domain),
//       manualReview: manualDomains.map((d) => d.domain),
//       failed: failedDomains.map((d) => d.domain),
//       remaining:
//         allowedDomains === -1
//           ? "Unlimited"
//           : allowedDomains - (existingCount + totalToInsert),
//     });
//   } catch (error) {
//     console.error("AddDomain Error:", error);
//     return res.status(500).json({
//       message: "Error adding domains",
//     });
//   }
// };



async function getFinalUrl(domain) {
  try {
    let url = domain.startsWith("http") ? domain : `http://${domain}`;

    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: 5000,
      validateStatus: () => true
    });

    return response.request?.res?.responseUrl || url;
  } catch (err) {
    return `http://${domain}`;
  }
}

exports.adminAddDomain = async (req, res) => {
  try {
    const adminId = req.user.id;

    let { domains, sellerName } = req.body;

    if (!domains) {
      return res.status(400).json({
        message: "No domains provided.",
      });
    }

    // 🧠 Normalize domains
    let normalizedDomains = [];

    if (typeof domains === "string") {
      normalizedDomains = domains
        .split(/[\n,]+/)
        .map((d) => ({
          domainName: d.trim(),
          url: null,
        }))
        .filter((d) => d.domainName);
    } else if (Array.isArray(domains)) {
      normalizedDomains = domains
        .map((d) => {
          if (typeof d === "string") {
            return { domainName: d.trim(), url: null };
          }

          if (typeof d === "object" && d.domainName) {
            return {
              domainName: d.domainName.trim(),
              url: d.url?.trim() || null,
            };
          }

          return null;
        })
        .filter(Boolean);
    } else {
      return res.status(400).json({
        message: "Invalid domains format.",
      });
    }

    if (!normalizedDomains.length) {
      return res.status(400).json({
        message: "No valid domains provided.",
      });
    }

    const allowedTLDs = [".com", ".org", ".net", ".ai", ".io", ".xyz"];

    const docs = [];
    let mismatchCount = 0;
    let failedTLD = 0;

    for (const d of normalizedDomains) {
      const domainName = d.domainName.toLowerCase();

      // ❌ TLD check
      if (!allowedTLDs.some((tld) => domainName.endsWith(tld))) {
        failedTLD++;

        docs.push({
          domain: encryptData(domainName),
          domainSearch: domainName,
          userId: adminId, // ✅ ADMIN AS OWNER

          sellerName: sellerName || "Admin",

          status: "Fail",
          finalUrl: d.url || null,
        });

        continue;
      }

      let finalUrl = null;
      let isMismatch = false;

      const keyword = domainName.split(".")[0];

      if (d.url) {
        if (!d.url.toLowerCase().includes(keyword)) {
          isMismatch = true;
          mismatchCount++;
        }
        finalUrl = d.url;
      } else {
        finalUrl = await getFinalUrl(domainName);
      }

      docs.push({
        domain: encryptData(domainName),
        domainSearch: domainName,
        userId: adminId, // ✅ ADMIN AS OWNER

        sellerName: sellerName || "Admin",

        status: isMismatch ? "Fail" : "Pass",
        reason: isMismatch ? "URL mismatch" : null,

        finalUrl,
        isChatActive:false
      });
    }

    if (docs.length) {
      await domainSchema.insertMany(docs);
    }

    return res.status(200).json({
      message: `Admin Upload Complete
Added: ${docs.filter(d => d.status === "Pass").length}
Failed: ${docs.filter(d => d.status === "Fail").length}`,

      added: docs.filter(d => d.status === "Pass").length,
      failed: docs.filter(d => d.status === "Fail").length,

      failedBreakdown: {
        tld: failedTLD,
        urlMismatch: mismatchCount,
      },
    });

  } catch (error) {
    console.error("Admin AddDomain Error:", error);

    return res.status(500).json({
      message: "Error adding domains",
    });
  }
};

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
          domainName: d.trim(),
          url: null,
        }))
        .filter((d) => d.domainName);
    }
    else if (Array.isArray(domains)) {
      normalizedDomains = domains
        .map((d) => {
          if (typeof d === "string") {
            return { domainName: d.trim(), url: null };
          }

          if (typeof d === "object" && typeof d.domainName === "string") {
            return {
              domainName: d.domainName.trim(),
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

    const allowedTLDs = [".com", ".org", ".net", ".ai", ".io", ".xyz"];

    const allowedList = [];
    const failedList = [];

    for (const d of normalizedDomains) {
      const lower = d.domainName.toLowerCase();

      if (allowedTLDs.some((tld) => lower.endsWith(tld))) {
        allowedList.push(d);
      } else {
        failedList.push(d);
      }
    }

    const existingEncrypted = await domainSchema
      .find({ userId })
      .select("domain")
      .lean();

    const existingPlain = existingEncrypted.map((d) =>
      decryptData(d.domain)
    );

    const domainsToInsert = [];

    for (const d of allowedList) {
      if (!existingPlain.includes(d.domainName)) {
        domainsToInsert.push(d);
      }
    }

    const existingCount = existingPlain.length;
    const totalToInsert = domainsToInsert.length;

    if (
      allowedDomains !== -1 &&
      existingCount + totalToInsert > allowedDomains
    ) {
      return res.status(400).json({
        message: `Your plan allows ${allowedDomains} domains. You already added ${existingCount}.`,
      });
    }

    const docs = [];
    let mismatchCount = 0;
    for (const d of domainsToInsert) {
      let finalUrl = null;
      let isMismatch = false;

      const domainName = d.domainName.toLowerCase();
      const domainKeyword = domainName.split(".")[0]; // inferno

      if (d.url) {
        const url = d.url.toLowerCase();

        if (!url.includes(domainKeyword)) {
          isMismatch = true;
          mismatchCount++;
        }

        finalUrl = d.url;
      } else {
        finalUrl = await getFinalUrl(d.domainName);
      }

      docs.push({
        domain: encryptData(d.domainName),
        domainSearch: domainName,
        userId,
        status: isMismatch ? "Fail" : "Pass",
        reason: isMismatch
          ? "URL provided doesn't match with domain name"
          : null,
        adminCheck: false,
        finalUrl,
      });
    }
    for (const d of failedList) {
      docs.push({
        domain: encryptData(d.domainName),
        domainSearch: d.domainName.toLowerCase(),
        userId,
        status: "Fail",
        adminCheck: false,
        finalUrl: d.url ? d.url : null,
      });
    }

    if (docs.length) {
      await domainSchema.insertMany(docs);
    }

    return res.status(200).json({
      message: `Added: ${domainsToInsert.length - mismatchCount}.
Failed: ${failedList.length + mismatchCount} 
(TLD: ${failedList.length}, URL mismatch: ${mismatchCount})`,

      added: domainsToInsert.length - mismatchCount,

      failed: failedList.length + mismatchCount,

      failedBreakdown: {
        tld: failedList.length,
        urlMismatch: mismatchCount,
      },

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
      .select("_id domain isChatActive isHidden createdAt finalUrl status isMessageNotificationEnabled isUserNameVisible")
      .sort({ createdAt: -1 })
      .lean();

    const domains = domainsEncrypted.map(d => ({
      id: d._id,
      domain: decryptData(d.domain),
      status: d.status,
      isChatActive: d.isChatActive,
      isHidden: d.isHidden,
      createdAt: d.createdAt,
      isUserNameVisible: d.isUserNameVisible,
      isMessageNotificationEnabled: d.isMessageNotificationEnabled,
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
exports.getAdminDomainsOnly = async (req, res) => {
  try {
    const adminId = req.user.id; // ✅ current logged-in admin

    const domainsEncrypted = await domainSchema
      .find({ userId: adminId }) // 🔥 ONLY ADMIN DOMAINS
      .populate("userId", "name email userName")
      .select(`
        _id 
        domain 
        createdAt 
        finalUrl 
        status 
        sellerName
      `)
      .sort({ createdAt: -1 })
      .lean();

    const domains = domainsEncrypted.map((d) => ({
      domainId: d._id,
      domain: decryptData(d.domain),
      status: d.status,
      createdAt: d.createdAt,
      finalUrl: d.finalUrl,

      // ✅ Always send seller
      sellerName: d.sellerName || d.userId?.userName || "Admin",

      owner: {
        // ✅ IMPORTANT FIX
        name: d.sellerName || d.userId?.userName || "Admin",
        email: d.userId?.email || "-",
      },
    }));

    res.status(200).json({
      success: true,
      count: domains.length,
      domains,
    });

  } catch (error) {
    console.error("Admin Get Domains Error:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving admin domains",
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

exports.bulkToggleHide = async (req, res) => {
  try {
    const { ids, value } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids) || typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "ids (array) and value (boolean) are required"
      });
    }

    const result = await domainSchema.updateMany(
      { _id: { $in: ids }, userId },
      { $set: { isHidden: value } }
    );

    return res.status(200).json({
      success: true,
      message: value
        ? "Domains hidden successfully"
        : "Domains unhidden successfully",
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("bulkToggleHide error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update domain visibility"
    });
  }
};

exports.toggleUserNameVisibility = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const domain = await domainSchema.findOneAndUpdate(
      { _id: id, userId },
      [{ $set: { isUserNameVisible: { $not: "$isUserNameVisible" } } }],
      { new: true }
    );

    if (!domain) {
      return res.status(404).json({
        status: false,
        message: "Domain not found"
      });
    }

    return res.status(200).json({
      status: true,
      message: domain.isUserNameVisible
        ? "Username visibility enabled"
        : "Username visibility disabled",
      data: {
        id: domain._id,
        isUserNameVisible: domain.isUserNameVisible
      }
    });
  } catch (error) {
    console.error("Toggle username visibility error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update username visibility"
    });
  }
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
    message: domain.isChatActive
      ? "Chat has been enabled. Buyers will be able to connect via portal"
      : "Chat is inactive. Buyer communication is limited to the landing page.",
    isChatActive: domain.isChatActive
  });

};

exports.bulkToggleChat = async (req, res) => {
  try {
    const { ids, value } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids) || typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "ids (array) and value (boolean) are required"
      });
    }

    const result = await domainSchema.updateMany(
      { _id: { $in: ids }, userId },
      { $set: { isChatActive: value } }
    );

    return res.status(200).json({
      success: true,
      message: value
        ? "Chat enabled for selected domains"
        : "Chat disabled for selected domains",
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("bulkToggleChat error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update chat status"
    });
  }
};

exports.bulkToggleUserNameVisibility = async (req, res) => {
  try {
    const { ids, value } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids) || typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "ids (array) and value (boolean) are required",
      });
    }

    const result = await domainSchema.updateMany(
      { _id: { $in: ids }, userId },
      { $set: { isUserNameVisible: value } }
    );

    return res.status(200).json({
      success: true,
      message: value
        ? "Username visibility enabled for selected domains"
        : "Username visibility disabled for selected domains",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("bulkToggleUserNameVisibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update username visibility",
    });
  }
};


exports.toggleMessageNotification = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const domain = await domainSchema.findOne({ _id: id, userId });
  if (!domain) {
    return res.status(404).json({ message: "Domain not found" });
  }

  domain.isMessageNotificationEnabled = !domain.isMessageNotificationEnabled;
  await domain.save();

  res.json({
    message: "Message notification preference updated",
    isMessageNotificationEnabled: domain.isMessageNotificationEnabled
  });
};

exports.bulkToggleMessageNotification = async (req, res) => {
  try {
    const { ids, value } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids) || typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "ids (array) and value (boolean) are required",
      });
    }

    const result = await domainSchema.updateMany(
      { _id: { $in: ids }, userId },
      { $set: { isMessageNotificationEnabled: value } }
    );

    return res.status(200).json({
      success: true,
      message: value
        ? "Email notifications enabled for selected domains"
        : "Email notifications disabled for selected domains",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("bulkToggleMessageNotification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification setting",
    });
  }
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
exports.AdminBulkDeleteDomains = async (req, res) => {
  try {
    const { domainIds } = req.body;

    if (!domainIds || !Array.isArray(domainIds) || domainIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "domainIds are required",
      });
    }

    const domains = await domainSchema.find({
      _id: { $in: domainIds },
    });

    if (!domains.length) {
      return res.status(404).json({
        success: false,
        message: "No domains found",
      });
    }

    await domainSchema.deleteMany({
      _id: { $in: domainIds },
    });

    return res.status(200).json({
      success: true,
      message: `${domains.length} domain(s) deleted successfully`,
      deletedCount: domains.length,
    });
  } catch (error) {
    console.error("AdminBulkDeleteDomains error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.updateAdminCheck = async (req, res) => {
  try {
    const { domainId } = req.params;
    const { adminCheck } = req.body;

    if (typeof adminCheck !== "boolean") {
      return res.status(400).json({
        message: "Invalid adminCheck value. It must be true or false.",
      });
    }

    const domain = await domainSchema.findById(domainId);

    if (!domain) {
      return res.status(404).json({
        message: "Domain not found.",
      });
    }

    domain.adminCheck = adminCheck;
    await domain.save();

    return res.status(200).json({
      message: "Admin check status updated successfully.",
      adminCheck: domain.adminCheck,
    });

  } catch (error) {
    console.error("Update AdminCheck Error:", error);

    return res.status(500).json({
      message: "Failed to update admin check status.",
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

// exports.getHiddenDomains = async (req, res) => {
//   try {
//     const MAX_LIMIT = 500;

//     const page = Math.max(parseInt(req.query.page) || 1, 1);
//     let limit = Math.min(parseInt(req.query.limit) || 10, MAX_LIMIT);
//     const skip = (page - 1) * limit;

//     const {
//       sortBy = "newest",
//       search = "",
//       extensions = "",
//       startsWith = "",
//       endsWith = "",
//       contains = "",
//       minLength,
//       maxLength,
//       sellerName
//     } = req.query;

//     const filter = {
//       isHidden: false,
//       status: "Pass"
//     };

//     // 🔍 SEARCH
//     if (search) {
//       filter.domainSearch = { $regex: search, $options: "i" };
//     }

//     // 👤 SELLER FILTER
//     if (sellerName) {
//       const users = await userSchema.find({
//         userName: { $regex: `^${sellerName}`, $options: "i" }
//       }).select("_id");

//       filter.userId = { $in: users.map(u => u._id) };
//     }

//     // 🔤 EXTENSIONS (.com,.ai etc)
//     if (extensions) {
//       const exts = extensions.split(",");
//       filter.domainSearch = {
//         $regex: `(${exts.map(e => e.replace(".", "\\.")).join("|")})$`,
//         $options: "i"
//       };
//     }

//     let pipeline = [
//       { $match: filter },

//       // 👇 extract name without extension
//       {
//         $addFields: {
//           name: {
//             $arrayElemAt: [
//               { $split: ["$domainSearch", "."] },
//               0
//             ]
//           }
//         }
//       },

//       {
//         $addFields: {
//           nameLength: { $strLenCP: "$name" }
//         }
//       }
//     ];

//     // 🔡 STARTS / ENDS / CONTAINS
//     if (startsWith) {
//       pipeline.push({
//         $match: { name: { $regex: `^${startsWith}`, $options: "i" } }
//       });
//     }

//     if (endsWith) {
//       pipeline.push({
//         $match: { name: { $regex: `${endsWith}$`, $options: "i" } }
//       });
//     }

//     if (contains) {
//       pipeline.push({
//         $match: { name: { $regex: contains, $options: "i" } }
//       });
//     }

//     // 📏 LENGTH FILTER
//     if (minLength) {
//       pipeline.push({
//         $match: { nameLength: { $gte: Number(minLength) } }
//       });
//     }

//     if (maxLength) {
//       pipeline.push({
//         $match: { nameLength: { $lte: Number(maxLength) } }
//       });
//     }

//     // 🔃 SORT (GLOBAL, BEFORE PAGINATION)
//     const sortMap = {
//       az: { name: 1 },
//       za: { name: -1 },
//       newest: { createdAt: -1 },
//       oldest: { createdAt: 1 },
//       length_asc: { nameLength: 1 },
//       length_desc: { nameLength: -1 }
//     };

//     pipeline.push({
//       $sort: sortMap[sortBy] || { createdAt: -1 }
//     });

//     // 📄 PAGINATION
//     pipeline.push({ $skip: skip }, { $limit: limit });

//     const domainsRaw = await domainSchema.aggregate(pipeline);

//     const total = await domainSchema.countDocuments(filter);

//     const domains = domainsRaw.map(d => ({
//       domainId: d._id,
//       domain: decryptData(d.domain),
//       createdAt: d.createdAt,
//       finalUrl: d.finalUrl,
//       user: {
//         id: d.userId,
//       },
//       isChatActive: d.isChatActive
//     }));

//     return res.status(200).json({
//       success: true,
//       domains,
//       total,
//       page,
//       totalPages: Math.ceil(total / limit),
//       limit
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch domains"
//     });
//   }
// };
exports.getHiddenDomains = async (req, res) => {
  try {
    const MAX_LIMIT = 500;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const {
      sortBy = "newest",
      search = "",
      extensions = "",
      startsWith = "",
      endsWith = "",
      contains = "",
      minLength,
      maxLength,
      sellerName
    } = req.query;

    // 🔹 BASE FILTER
    const filter = {
      isHidden: false,
      status: "Pass"
    };

    // 🔍 SEARCH
    if (search) {
      filter.domainSearch = { $regex: search, $options: "i" };
    }

    // 👤 SELLER FILTER
    if (sellerName) {
      const users = await userSchema.find({
        userName: { $regex: `^${sellerName}`, $options: "i" }
      }).select("_id");

      filter.userId = { $in: users.map(u => u._id) };
    }

    // 🔤 EXTENSIONS
    if (extensions) {
      const exts = extensions.split(",");
      filter.domainSearch = {
        $regex: `(${exts.map(e => e.replace(".", "\\.")).join("|")})$`,
        $options: "i"
      };
    }

    // 🔹 PIPELINE START
    let pipeline = [
      { $match: filter },

      // 🔗 JOIN USER (OPTIMIZED)
      {
        $lookup: {
          from: "users",
          let: { uid: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
            { $project: { userName: 1 } }
          ],
          as: "user"
        }
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true
        }
      },

      // ✂️ DOMAIN NAME WITHOUT EXTENSION
      {
        $addFields: {
          name: {
            $arrayElemAt: [{ $split: ["$domainSearch", "."] }, 0]
          }
        }
      },

      // 📏 LENGTH
      {
        $addFields: {
          nameLength: { $strLenCP: "$name" }
        }
      },

      {
        $addFields: {
          userName: {
            $cond: [
              {
                $and: [
                  // ❗ ADD THIS LINE (KEY FIX)
                  { $eq: [{ $ifNull: ["$sellerName", ""] }, ""] },

                  { $eq: ["$isUserNameVisible", true] },
                  { $ne: ["$user.userName", null] },
                  { $ne: ["$user.userName", ""] }
                ]
              },
              "$user.userName", // ✅ PRIORITY 1 (ONLY normal users)

              {
                $cond: [
                  {
                    $and: [
                      { $ne: [{ $ifNull: ["$sellerName", ""] }, ""] }
                    ]
                  },
                  "$sellerName", // ✅ PRIORITY 2 (admin domains)
                  null
                ]
              }
            ]
          }
        }
      }
    ];
    // 🔡 FILTERS
    if (startsWith) {
      pipeline.push({
        $match: { name: { $regex: `^${startsWith}`, $options: "i" } }
      });
    }

    if (endsWith) {
      pipeline.push({
        $match: { name: { $regex: `${endsWith}$`, $options: "i" } }
      });
    }

    if (contains) {
      pipeline.push({
        $match: { name: { $regex: contains, $options: "i" } }
      });
    }

    if (minLength) {
      pipeline.push({
        $match: { nameLength: { $gte: Number(minLength) } }
      });
    }

    if (maxLength) {
      pipeline.push({
        $match: { nameLength: { $lte: Number(maxLength) } }
      });
    }

    // 🔃 SORT
    const sortMap = {
      az: { name: 1 },
      za: { name: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      length_asc: { nameLength: 1 },
      length_desc: { nameLength: -1 }
    };

    pipeline.push({
      $sort: sortMap[sortBy] || { createdAt: -1 }
    });

    // 🧮 TOTAL COUNT (CORRECT WAY)
    const totalPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await domainSchema.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    // 📄 PAGINATION
    pipeline.push({ $skip: skip }, { $limit: limit });

    const domainsRaw = await domainSchema.aggregate(pipeline);

    // 🔓 FORMAT RESPONSE
    const domains = domainsRaw.map(d => ({
      domainId: d._id,
      domain: decryptData(d.domain),
      createdAt: d.createdAt,
      finalUrl: d.finalUrl,
      isChatActive: d.isChatActive,
      user: {
        id: d.userId,
        userName: d.userName || null
      }
    }));

    return res.status(200).json({
      success: true,
      domains,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch domains"
    });
  }
};
exports.getDomainsBySeller = async (req, res) => {
  try {
    const MAX_LIMIT = 500;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    let limit = parseInt(req.query.limit) || 10;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const skip = (page - 1) * limit;

    const sellerName = (req.params.sellerName || "").trim();

    if (!sellerName) {
      return res.status(400).json({
        success: false,
        message: "Invalid user name",
      });
    }

    const escapeRegex = (str) =>
      str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const safeSearch = escapeRegex(sellerName);

    // 🔍 1. Find matching USERS
    const users = await userSchema
      .find({
        userName: { $regex: `^${safeSearch}`, $options: "i" }
      })
      .select("_id userName")
      .lean();

    const userIds = users.map((u) => u._id);

    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u.userName;
    });

    // 🔍 2. Build OR filter
    const filter = {
      status: "Pass",
      isHidden: false,
      $or: [
        // ✅ CASE 1: sellerName match (IGNORE visibility)
        {
          sellerName: { $regex: `^${safeSearch}`, $options: "i" }
        },

        // ✅ CASE 2: user match BUT only visible
        {
          userId: { $in: userIds },
          isUserNameVisible: true
        }
      ]
    };

    const [domainsEncrypted, total] = await Promise.all([
      domainSchema
        .find(filter)
        .select(
          "_id domain isChatActive finalUrl createdAt userId sellerName isUserNameVisible"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      domainSchema.countDocuments(filter),
    ]);

    // 🔥 FINAL MAPPING LOGIC
    const domains = domainsEncrypted.map((d) => {
      const userNameFromUser = userMap[d.userId?.toString()] || null;

      let finalUserName = null;

      // ✅ sellerName match takes priority if exists
      if (d.sellerName && d.sellerName.trim() !== "") {
        finalUserName = d.sellerName;
      }

      // ✅ otherwise fallback to userName (only visible ones already filtered)
      else if (d.isUserNameVisible && userNameFromUser) {
        finalUserName = userNameFromUser;
      }

      return {
        domainId: d._id,
        domain: decryptData(d.domain),
        createdAt: d.createdAt,
        user: {
          id: d.userId,
          userName: finalUserName,
        },
        isChatActive: d.isChatActive,
        finalUrl: d.finalUrl || null,
      };
    });

    return res.status(200).json({
      success: true,
      domains,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });

  } catch (error) {
    console.error("getDomainsBySeller error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch domains",
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

exports.getAllDomains = async (req, res) => {
  try {
    const domainsRaw = await domainSchema
      .find({})
      .populate({
        path: "userId",
        select: "name email"
      })
      .sort({
        isPromoted: -1,
        promotionPriority: 1,
        createdAt: -1
      })
      .select(
        "_id domain promotionPriority isPromoted status finalUrl userId createdAt adminCheck"
      )
      .lean();

    // ✅ COUNT MANUAL REVIEW
    const manualReviewCount = domainsRaw.filter(
      d => d.status === "Manual Review"
    ).length;

    const domains = domainsRaw.map(d => ({
      domainId: d._id,
      domain: decryptData(d.domain),
      isPromoted: d.isPromoted,
      priority: d.promotionPriority ?? null,
      status: d.status,
      finalUrl: d.finalUrl || null,
      createdAt: d.createdAt,
      adminCheck: d.adminCheck,
      owner: d.userId
        ? {
          name: d.userId.name,
          email: d.userId.email
        }
        : {
          name: "Anonymous",
        }
    }));

    return res.status(200).json({
      success: true,
      count: domains.length,
      manualReviewCount,
      domains
    });

  } catch (error) {
    console.error("Get all domains error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch domains"
    });
  }
};

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
    const { domainId, status } = req.body;

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

    // if (status === "Pass") {
    //   const previousStatus = domain.status;

    //   // ❗ Fail → Pass requires URL
    //   if (previousStatus === "Fail") {
    //     if (!finalUrl || typeof finalUrl !== "string") {
    //       return res.status(400).json({
    //         success: false,
    //         message:
    //           "Final URL is required when moving from Fail to Pass",
    //       });
    //     }

    //     try {
    //       new URL(finalUrl);
    //     } catch {
    //       return res.status(400).json({
    //         success: false,
    //         message: "Invalid final URL format",
    //       });
    //     }

    //     domain.finalUrl = finalUrl;
    //   }

    //   // ✅ Manual Review → Pass (no URL required)
    //   if (previousStatus === "Manual Review") {
    //     // keep existing finalUrl if any
    //     // do nothing
    //   }
    // }

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

exports.serachDomain = async (req, res) => {
  try {
    const search = (req.query.search || "").trim().toLowerCase();
    const { date } = req.query;

    const query = {
      status: "Pass",
      isHidden: false
    };

    if (search) {
      query.domainSearch = {
        $exists: true,
        $regex: search,
        $options: "i"
      };
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const domainsRaw = await domainSchema
      .find(query)
      .populate({ path: "userId", select: "userName" })
      .sort({
        isPromoted: -1,
        promotionPriority: 1,
        createdAt: -1
      })
      .select("_id domain finalUrl userId isUserNameVisible sellerName")
      .lean();

    const domains = domainsRaw.map(d => ({
      domainId: d._id,
      domain: decryptData(d.domain),
      finalUrl: d.finalUrl || null,
      user: {
        userName:
          d.isUserNameVisible === false
            ? "Anonymous"
            : d.sellerName || d.userId?.userName || "Anonymous"
      }
    }));
    res.json({
      success: true,
      count: domains.length,
      total: domains.length,
      domains
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};



exports.updateSellerName = async (req, res) => {
  try {
    const { id, sellerName } = req.body;

    if (!id || !sellerName) {
      return res.status(400).json({
        success: false,
        message: "Domain ID and sellerName are required",
      });
    }

    const updated = await domainSchema.findByIdAndUpdate(
      id,
      {
        sellerName: sellerName.trim(),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Domain not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Seller name updated successfully",
      domainId: updated._id,
      sellerName: updated.sellerName,
    });

  } catch (error) {
    console.error("Update Seller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update seller name",
    });
  }
};

exports.bulkUpdateSellerName = async (req, res) => {
  try {
    const { ids, sellerName } = req.body;

    // 🔍 Validation
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No domain IDs provided",
      });
    }

    if (!sellerName || !sellerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Seller name is required",
      });
    }

    // 🧹 Clean seller name
    const cleanSeller = sellerName.trim();

    // 🔐 OPTIONAL: Restrict to admin-owned domains
    const adminId = req.user.id;

    const result = await domainSchema.updateMany(
      {
        _id: { $in: ids },
        userId: adminId // ✅ ensures only admin's domains updated
      },
      {
        $set: {
          sellerName: cleanSeller,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Seller name updated successfully",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });

  } catch (error) {
    console.error("Bulk Update Seller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update seller names",
    });
  }
};





