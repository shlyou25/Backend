const { packages } = require("../middlewares/PackagePlan");
const Plan = require('../../models/packages')
const userSchema=require('../../models/user')
async function createPlanAfterPayment({ userId, planTitle }) {
  const selectedPlan = packages.find(p => p.title === planTitle);
  if (!selectedPlan) throw new Error("Invalid plan");

  const existing = await Plan.findOne({ userId })
    .sort({ createdAt: -1 });

  if (existing && existing.endingDate > new Date()) {
    throw new Error("Active plan already exists");
  }

  const startDate = new Date();
  const endingDate = new Date();
  endingDate.setMonth(endingDate.getMonth() + 1);

  const newPlan = await Plan.create({
    userId,
    title: selectedPlan.title,
    price: selectedPlan.price,
    per: selectedPlan.per,
    feature: selectedPlan.feature,
    startDate,
    endingDate
  });

  await userSchema.findByIdAndUpdate(
    userId,
    { $push: { plans: newPlan._id } }
  );

  return newPlan;
}
module.exports = createPlanAfterPayment;