const axios = require("axios");
const Domain = require("../../models/domain");

const BATCH_SIZE = 10;

async function processDomains() {
  try {
    // 1. Pick 10 pending domains
    const domains = await Domain.find({
      processingStatus: "pending"
    })
      .limit(BATCH_SIZE);

    if (!domains.length) return;

    const ids = domains.map(d => d._id);
    const domainNames = domains.map(d => d.domainSearch);

    // 2. Mark them as processing (avoid duplicate picking)
    await Domain.updateMany(
      { _id: { $in: ids } },
      { $set: { processingStatus: "processing" } }
    );

    // 3. Call checker API
    const response = await axios.post(
      "https://domain-analyser-g5oce.ondigitalocean.app/check_domains",
      {
        domains: domainNames
      }
    );

    const results = response.data.results;

    // 4. Map results for quick lookup
    const resultMap = {};
    results.forEach(r => {
      resultMap[r.domain.toLowerCase()] = r;
    });

    // 5. Update DB
    const bulkOps = domains.map(d => {
      const r = resultMap[d.domainSearch];

      if (!r) {
        return {
          updateOne: {
            filter: { _id: d._id },
            update: {
              $set: { processingStatus: "done" }
            }
          }
        };
      }

      return {
        updateOne: {
          filter: { _id: d._id },
          update: {
            $set: {
              status: r.status, // 🔥 overwrite Pass → Fail if needed
              finalUrl: r.final_url,
              reason: r.reason,
              processingStatus: "done"
            }
          }
        }
      };
    });

    if (bulkOps.length) {
      await Domain.bulkWrite(bulkOps);
    }

  } catch (err) {
    console.error("Domain Processor Error:", err);
  }
}

module.exports = processDomains;