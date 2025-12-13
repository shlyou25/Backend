const planSchema = require('../../../models/packages');
const domainSchema = require('../../../models/domain');
const { packages } = require('../../middlewares/PackagePlan');
const { encryptData, decryptData } = require('../../middlewares/crypto');

exports.adddomain = async (req, res) => {
    try {
        const userId = req.user._id;
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

exports.getdomainbyid = async (req, res) => {
    try {
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized user" });
        }
        // Fetch all domains of this user
        const domainsEncrypted  = await domainSchema
            .find({ userId })
            .select("domain -_id")           // include these fields
            .sort({ createdAt: -1 });

        // decrypt all
        const domains = domainsEncrypted.map(d => ({
            domain: decryptData(d.domain),  // 🔓 decrypted
            createdAt: d.createdAt
        }));
        res.status(200).json({
            status: true,
            count: domains.length,
            domains,
            message: "Domain Successully Feteched"
        });

    } catch (error) {
        console.error("Get Domain Error:", error);
        res.status(500).json({
            status: false,
            message: "Error retrieving domains"
        });
    }
};