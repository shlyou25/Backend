const Domain = require("../../../models/domain");
const { decryptData } = require("../../middlewares/crypto");
const {sendEmail} = require('../../utils/sendEmail')


exports.sendEmailToSeller = async (req, res) => {
  const { domainId, buyerEmail, subject, message } = req.body;

  const domain = await Domain.findById(domainId).populate("userId");
  if (!domain) return res.status(404).json({ message: "Domain not found" });

  await sendEmail({
    to: domain.userId.email, // 🔒 hidden from buyer
    subject,
    html: `
      <p><strong>Buyer Email:</strong> ${buyerEmail}</p>
      <p><strong>Domain:</strong> ${decryptData(domain.domain)}</p>
      <hr/>
      <p>${message}</p>
    `
  });

  return res.json({ success: true });
};
