const planSchema = require('../../../models/packages');
const domainSchema = require('../../../models/domain');
const { packages } = require('../../middlewares/PackagePlan')
const { encryptData, decryptData } = require('../../middlewares/crypto')

exports.adddomain = async (req, res) => {
    try {
        const userId = req.user._id;
        const activePlan = await planSchema.findOne({ userId })
            .sort({ createdAt: -1 });

        if (!activePlan || activePlan.endingDate < new Date()) {
            return res.status(400).json({
                message: "Please get a plan before adding domains."
            });
        }

        const matchedPlan = packages.find(p => p.title === activePlan.title);
        if (!matchedPlan) {
            return res.status(500).json({ message: "Plan info mismatched." });
        }

        const allowedDomains = matchedPlan.feature;

        const existingCount = await domainSchema.countDocuments({ userId });
        let { domains } = req.body;
        if (!domains) {
            return res.status(400).json({ message: "No domains provided." });
        }

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
            if (seen.has(d)) {
                duplicatesInRequest.push(d);
            }
            seen.add(d);
        });

        if (duplicatesInRequest.length > 0) {
            return res.status(400).json({
                message: "Duplicate domains found in your request.",
                status: false,
                duplicates: [...new Set(duplicatesInRequest)]
            });
        }

        if (existingCount + domains.length > allowedDomains) {
            return res.status(400).json({
                message: `Your plan allows ${allowedDomains} domains. 
You already added ${existingCount}. 
You are trying to add ${domains.length}, which exceeds your limit.`
            });
        }
        const existingDomains = await domainSchema.find({
            userId,
            domain: { $in: domains }
        }).lean();

        if (existingDomains.length > 0) {
            const duplicates = existingDomains.map(d => d.domain);
            return res.status(400).json({
                message: "Some domains already exist.",
                duplicates
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
}
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